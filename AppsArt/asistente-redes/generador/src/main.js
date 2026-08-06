'use strict';
const { initFirebase } = require('./firebase');
const { cuentasVencidas, proximoTema } = require('./cuentas');
const { generarTexto } = require('./texto');
const { generarImagen } = require('./imagen');
const { generarVideo } = require('./video');
const { generarNarracion } = require('./narracion');
const { mezclarVideoYNarracion } = require('./merge');
const { subirArchivo } = require('./storage');
const { notificarNtfy } = require('./notificar');
const { registrarCorrida } = require('./runLog');

const DRY_RUN = process.env.DRY_RUN === 'true';
const SOLO_CUENTA = process.env.SOLO_CUENTA || '';

/* Une caption+imagen(+video+locución) para UNA cuenta y deja todo listo como
   contenido 'pendiente' en Firestore. Se llama en paralelo por cuenta desde
   main() con Promise.allSettled — si esto tira, esa cuenta no bloquea a las demás. */
async function procesarCuenta(db, bucket, cuenta){
  const { tema, nuevoIndex } = proximoTema(cuenta);
  const esVideo = cuenta.mediaType === 'imagen+video';

  if(DRY_RUN){
    // No llama a ninguna API paga: valida que Firestore/Storage/ntfy respondan de punta a punta.
    const ref = await db.collection('contenido').add({
      cuentaId: cuenta.id, estado: 'pendiente', tipo: esVideo ? 'video' : 'imagen',
      tema, caption: `[DRY RUN] ${cuenta.nombre} — ${tema}`,
      mediaUrl: null, generadoEn: new Date().toISOString()
    });
    await db.collection('cuentas').doc(cuenta.id).update({
      ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex
    });
    return { cuentaId: cuenta.id, ok: true, contenidoId: ref.id, dryRun: true };
  }

  const texto = await generarTexto(cuenta, tema);
  const imagenBuffer = await generarImagen(texto.promptImagen);

  const base = `cuentas/${cuenta.slug}/${Date.now()}`;
  let mediaUrl, thumbnailUrl = null, tipo = 'imagen', guionFinal = null;

  if(esVideo){
    const videoUrl = await generarVideo(texto.promptVideo, imagenBuffer);
    const narracionBuffer = await generarNarracion(texto.guion);
    const { videoBuffer, posterBuffer } = await mezclarVideoYNarracion(videoUrl, narracionBuffer);
    mediaUrl = await subirArchivo(bucket, videoBuffer, `${base}/video.mp4`, 'video/mp4');
    thumbnailUrl = await subirArchivo(bucket, posterBuffer, `${base}/poster.jpg`, 'image/jpeg');
    tipo = 'video';
    guionFinal = texto.guion;
  } else {
    mediaUrl = await subirArchivo(bucket, imagenBuffer, `${base}/imagen.png`, 'image/png');
  }

  const contenidoRef = await db.collection('contenido').add({
    cuentaId: cuenta.id, estado: 'pendiente', tipo, tema,
    caption: texto.caption, guion: guionFinal,
    mediaUrl, thumbnailUrl,
    promptImagen: texto.promptImagen, promptVideo: texto.promptVideo || null,
    metadatos: {
      modeloImagen: 'gpt-image-1',
      modeloVideo: esVideo ? 'runway-gen3a_turbo' : null,
      modeloTTS: esVideo ? 'elevenlabs' : null,
      modeloTexto: 'claude-sonnet-5'
    },
    generadoEn: new Date().toISOString()
  });

  await db.collection('cuentas').doc(cuenta.id).update({
    ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex
  });

  return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
}

async function main(){
  const inicio = Date.now();
  const { db, bucket } = initFirebase();

  let cuentas = await cuentasVencidas(db);
  if(SOLO_CUENTA) cuentas = cuentas.filter(c => c.slug === SOLO_CUENTA || c.id === SOLO_CUENTA);

  console.log(`Modo: ${DRY_RUN ? 'DRY RUN' : 'real'}. Cuentas a procesar: ${cuentas.map(c => c.nombre).join(', ') || '(ninguna vencida hoy)'}`);

  const resultados = await Promise.allSettled(cuentas.map(c => procesarCuenta(db, bucket, c)));

  const cuentasProcesadas = resultados.map((r, i) => {
    if(r.status === 'fulfilled') return r.value;
    return { cuentaId: cuentas[i].id, ok: false, error: String((r.reason && r.reason.message) || r.reason) };
  });

  for(const res of cuentasProcesadas){
    if(!res.ok){
      console.error(`Error en cuenta ${res.cuentaId}:`, res.error);
      await db.collection('contenido').add({
        cuentaId: res.cuentaId, estado: 'error', errorGeneracion: res.error,
        generadoEn: new Date().toISOString()
      }).catch(()=>{});
    }
  }

  await registrarCorrida(db, { cuentasProcesadas, duracionMs: Date.now() - inicio });

  const okList = cuentasProcesadas.filter(r => r.ok);
  if(okList.length > 0){
    const nombres = okList.map(r => ((cuentas.find(c => c.id === r.cuentaId) || {}).nombre) || r.cuentaId);
    await notificarNtfy(`Contenido nuevo listo para revisar: ${nombres.join(', ')}`, 'Asistente de Redes');
  }

  if(cuentas.length > 0 && okList.length === 0){
    console.error('Ninguna cuenta se procesó correctamente en esta corrida.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fallo general del generador:', err);
  process.exit(1);
});
