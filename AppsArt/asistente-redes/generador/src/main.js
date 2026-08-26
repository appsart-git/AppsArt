'use strict';
const { initFirebase } = require('./firebase');
const { cuentasActivas, cuentasVencidas, proximoTema } = require('./cuentas');
const { generarTexto, generarTextoCarrusel, generarTextoFichaProducto, generarTextoInstitucional } = require('./texto');
const { generarImagen } = require('./imagen');
const { generarVideo } = require('./video');
const { generarNarracion } = require('./narracion');
const { mezclarVideoYNarracion } = require('./merge');
const { renderCarrusel } = require('./carrusel');
const { renderFicha, renderInstitucionalImg } = require('./ficha');
const productosEntrePymes = require('./entrepymes-productos.json');
const { subirArchivo } = require('./storage');
const { notificarNtfy } = require('./notificar');
const { registrarCorrida } = require('./runLog');

const DRY_RUN = process.env.DRY_RUN === 'true';
const SOLO_CUENTA = process.env.SOLO_CUENTA || '';

/* Une caption+imagen(+video+locución) para UNA cuenta y deja todo listo como
   contenido 'pendiente' en Firestore. Se llama en paralelo por cuenta desde
   main() con Promise.allSettled — si esto tira, esa cuenta no bloquea a las demás. */
async function procesarCuenta(db, bucket, cuenta){
  /* "Regenerar" desde el dashboard: el usuario no puede llamar a las APIs (viven
     solo acá, con las keys de GitHub Actions), así que lo único que puede hacer
     es dejar pedido un tema puntual en Firestore. Si hay uno pendiente, se usa
     ese en vez de avanzar la rotación normal, y se limpia el pedido al terminar. */
  const regenerando = !!cuenta.regenerarTema;
  const { tema, nuevoIndex } = regenerando
    ? { tema: cuenta.regenerarTema, nuevoIndex: cuenta.ultimoTemaIndex || 0 }
    : proximoTema(cuenta);
  const esVideo = cuenta.mediaType === 'imagen+video';
  // Fallback temporal: hasta que el dashboard tenga un campo para esto, AppsArt
  // (la única cuenta con identidad de marca real verificada) siempre usa carrusel.
  const esCarrusel = cuenta.formatoCarrusel === true || cuenta.slug === 'appsart';

  if(DRY_RUN){
    // No llama a ninguna API paga: valida que Firestore/Storage/ntfy respondan de punta a punta.
    const tipoDry = esCarrusel ? 'carrusel' : (esVideo ? 'video' : 'imagen');
    const ref = await db.collection('contenido').add({
      cuentaId: cuenta.id, estado: 'pendiente', tipo: tipoDry,
      tema, caption: `[DRY RUN] ${cuenta.nombre} — ${tema}`,
      mediaUrl: null, generadoEn: new Date().toISOString()
    });
    await db.collection('cuentas').doc(cuenta.id).update({
      ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null
    });
    return { cuentaId: cuenta.id, ok: true, contenidoId: ref.id, dryRun: true };
  }

  if(cuenta.slug === 'entre-pymes'){
    const producto = productosEntrePymes.find(p => p.nombre === tema);
    const base = `cuentas/${cuenta.slug}/${Date.now()}`;

    if(producto){
      // Varias fotos reales por máquina: un contador global de la cuenta va
      // rotando cuál foto toca, así dos posts seguidos de la misma máquina no
      // repiten la misma imagen.
      const contadorFotos = cuenta.entrepymesFotoContador || 0;
      const fotoUrl = producto.fotos[contadorFotos % producto.fotos.length];
      const texto = await generarTextoFichaProducto(cuenta, producto);
      const buffer = await renderFicha({ fotoUrl, nombre: producto.nombre, specs: texto.specs, cta: texto.cta });
      const mediaUrl = await subirArchivo(bucket, buffer, `${base}/imagen.png`, 'image/png');
      const contenidoRef = await db.collection('contenido').add({
        cuentaId: cuenta.id, estado: 'pendiente', tipo: 'imagen', tema,
        caption: texto.caption, mediaUrl,
        metadatos: { modeloTexto: 'claude-sonnet-5', render: 'html-ficha-producto', fotoUrl },
        generadoEn: new Date().toISOString()
      });
      await db.collection('cuentas').doc(cuenta.id).update({
        ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null,
        entrepymesFotoContador: contadorFotos + 1
      });
      return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
    }

    const texto = await generarTextoInstitucional(cuenta, tema);
    const buffer = await renderInstitucionalImg({ eyebrow: texto.eyebrow, titulo: texto.titulo, texto: texto.texto });
    const mediaUrl = await subirArchivo(bucket, buffer, `${base}/imagen.png`, 'image/png');
    const contenidoRef = await db.collection('contenido').add({
      cuentaId: cuenta.id, estado: 'pendiente', tipo: 'imagen', tema,
      caption: texto.caption, mediaUrl,
      metadatos: { modeloTexto: 'claude-sonnet-5', render: 'html-institucional' },
      generadoEn: new Date().toISOString()
    });
    await db.collection('cuentas').doc(cuenta.id).update({
      ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null
    });
    return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
  }

  if(esCarrusel){
    const texto = await generarTextoCarrusel(cuenta, tema);
    const buffers = await renderCarrusel(texto.slides);
    const base = `cuentas/${cuenta.slug}/${Date.now()}`;
    const mediaUrls = [];
    for(let i = 0; i < buffers.length; i++){
      mediaUrls.push(await subirArchivo(bucket, buffers[i], `${base}/slide-${i + 1}.png`, 'image/png'));
    }
    const contenidoRef = await db.collection('contenido').add({
      cuentaId: cuenta.id, estado: 'pendiente', tipo: 'carrusel', tema,
      caption: texto.caption, mediaUrl: mediaUrls[0], mediaUrls,
      metadatos: { modeloTexto: 'claude-sonnet-5', render: 'html-carrusel' },
      generadoEn: new Date().toISOString()
    });
    await db.collection('cuentas').doc(cuenta.id).update({
      ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null
    });
    return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
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
    ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null
  });

  return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
}

async function main(){
  const inicio = Date.now();
  const { db, bucket } = initFirebase();

  /* soloCuenta es una orden manual explícita (para probar una cuenta puntual):
     se procesa esa cuenta sin importar si le tocaba por cadencia todavía. */
  let cuentas;
  if(SOLO_CUENTA){
    const activas = await cuentasActivas(db);
    cuentas = activas.filter(c => c.slug === SOLO_CUENTA || c.id === SOLO_CUENTA);
  } else {
    cuentas = await cuentasVencidas(db);
  }

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
