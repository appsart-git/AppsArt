'use strict';
const { initFirebase } = require('./firebase');
const { cuentasActivas, cuentasVencidas, proximoTema } = require('./cuentas');
const { generarTexto, generarTextoCarrusel, generarTextoFichaProducto, generarTextoInstitucional, generarTextoVideoProducto, generarTextoEspacio, generarTextoEspacioCarrusel } = require('./texto');
const { generarImagen } = require('./imagen');
const { generarVideo } = require('./video');
const { generarNarracion } = require('./narracion');
const { mezclarVideoYNarracion } = require('./merge');
const { renderCarrusel } = require('./carrusel');
const { renderFicha, renderInstitucionalImg } = require('./ficha');
const { elegirPromptVideo } = require('./video-tecnoart');
const { elegirSfx } = require('./sfx');
const { renderLogoOutro } = require('./logo-outro');
const { renderSubtitulos } = require('./subtitulo-tecnoart');
const { descargarDriveArchivo } = require('./drive');
const { normalizarVideoReal } = require('./video-real-tecnoart');
const { elegirEfectoReal } = require('./efectos-real-tecnoart');
const { obtenerFotoReal } = require('./foto-real-tresestaciones');
const { renderEspacio } = require('./espacio');
const { renderEspacioCarrusel } = require('./espacio-carrusel');
const productosEntrePymes = require('./entrepymes-productos.json');
const productosTecnoArt = require('./tecnoart-productos.json');
const videosTecnoArt = require('./tecnoart-videos.json');
const fotosTresEstaciones = require('./tresestaciones-fotos.json');
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

  if(cuenta.slug === 'tecno-art'){
    const producto = productosTecnoArt.find(p => p.nombre === tema);
    if(!producto){
      throw new Error(`No se encontró el producto real "${tema}" en tecnoart-productos.json — revisar temasContenido de la cuenta.`);
    }
    const texto = await generarTextoVideoProducto(cuenta, producto);

    /* Si hay filmación real del producto (ver tecnoart-videos.json — cliente filmó los
       productos con el celular), se usa esa en vez de que Runway anime una foto: más
       fiel al producto real y sin costo de Runway. Se rota entre las tomas reales
       disponibles con su propio contador, igual que las fotos. */
    const videosReales = videosTecnoArt[producto.nombre] || [];
    let videoInput, metadatosVideo, actualizacionCuenta;
    if(videosReales.length > 0){
      const contadorVideo = cuenta.tecnoArtVideoRealContador || 0;
      const elegido = videosReales[contadorVideo % videosReales.length];
      const crudo = await descargarDriveArchivo(elegido.driveFileId);
      const { nombre: efectoNombre, filtro: efectoFiltro } = elegirEfectoReal();
      videoInput = await normalizarVideoReal(crudo, efectoFiltro);
      metadatosVideo = { modeloVideo: 'filmacion-real', archivoOrigen: elegido.filename, variante: efectoNombre };
      actualizacionCuenta = { tecnoArtVideoRealContador: contadorVideo + 1 };
    } else {
      const contadorFotos = cuenta.tecnoArtFotoContador || 0;
      const fotoUrl = producto.fotos[contadorFotos % producto.fotos.length];
      const { promptVideo, variante } = elegirPromptVideo(producto);
      videoInput = await generarVideo(promptVideo, fotoUrl);
      metadatosVideo = { modeloVideo: 'runway-gen4_turbo', fotoUrl, variante };
      actualizacionCuenta = { tecnoArtFotoContador: contadorFotos + 1 };
    }

    const { audioBuffer, voz, subtitulos: bloquesSubtitulo } = await generarNarracion(texto.guion);
    const { buffer: sfxBuffer, nombre: sfxNombre } = elegirSfx();
    const outroBuffer = await renderLogoOutro();
    const subtitulos = await renderSubtitulos(bloquesSubtitulo);
    const { videoBuffer, posterBuffer } = await mezclarVideoYNarracion(videoInput, audioBuffer, sfxBuffer, outroBuffer, subtitulos);

    const base = `cuentas/${cuenta.slug}/${Date.now()}`;
    const mediaUrl = await subirArchivo(bucket, videoBuffer, `${base}/video.mp4`, 'video/mp4');
    const thumbnailUrl = await subirArchivo(bucket, posterBuffer, `${base}/poster.jpg`, 'image/jpeg');

    const contenidoRef = await db.collection('contenido').add({
      cuentaId: cuenta.id, estado: 'pendiente', tipo: 'video', tema,
      caption: texto.caption, guion: texto.guion, mediaUrl, thumbnailUrl,
      metadatos: { modeloTexto: 'claude-sonnet-5', modeloTTS: 'elevenlabs', voz, sfx: sfxNombre, ...metadatosVideo },
      generadoEn: new Date().toISOString()
    });
    await db.collection('cuentas').doc(cuenta.id).update({
      ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null,
      ...actualizacionCuenta
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

  if(cuenta.slug === 'casa-quinta-tres-estaciones'){
    const categoriaPorTema = {
      'La pileta': 'pileta',
      'El quincho y la galería': 'quincho-parrilla',
      'El horno de barro': 'horno-barro',
      'El jardín y la naturaleza': 'vegetacion-jardin',
      'La entrada y la fachada': 'exterior-fachada-entrada',
      'La cocina': 'interior-casa'
    };
    const categoria = categoriaPorTema[tema];
    const pool = categoria && fotosTresEstaciones[categoria];
    if(!pool || pool.length === 0){
      throw new Error(`No hay fotos reales cargadas para el tema "${tema}" — revisar tresestaciones-fotos.json/temasContenido de la cuenta.`);
    }

    // Con 3 fotos o más alcanza para armar un carrusel (portada + contenido + cierre) que
    // aprovecha varios ángulos reales del mismo lugar en un solo posteo. Con menos, un
    // carrusel queda pobre — se mantiene el formato de una sola foto, rotando por categoría.
    if(pool.length >= 3){
      const fotos = [];
      for(const item of pool){
        fotos.push({ item, buffer: await obtenerFotoReal(item) });
      }
      const descripciones = pool.map(p => p.descripcion);
      const texto = await generarTextoEspacioCarrusel(cuenta, tema, descripciones);

      const slides = [{
        tipo: 'portada', fotoBuffer: fotos[0].buffer, foco: fotos[0].item.foco,
        eyebrow: texto.portada.eyebrow, titulo: texto.portada.titulo, subtitulo: texto.portada.subtitulo
      }];
      for(let i = 1; i < fotos.length; i++){
        slides.push({ tipo: 'contenido', fotoBuffer: fotos[i].buffer, foco: fotos[i].item.foco, texto: texto.slides[i - 1] });
      }
      slides.push({ tipo: 'cierre', titulo: texto.cierre.titulo, cta: texto.cierre.cta });

      const buffers = await renderEspacioCarrusel(slides);
      const base = `cuentas/${cuenta.slug}/${Date.now()}`;
      const mediaUrls = [];
      for(let i = 0; i < buffers.length; i++){
        mediaUrls.push(await subirArchivo(bucket, buffers[i], `${base}/slide-${i + 1}.png`, 'image/png'));
      }

      const contenidoRef = await db.collection('contenido').add({
        cuentaId: cuenta.id, estado: 'pendiente', tipo: 'carrusel', tema,
        caption: texto.caption, mediaUrl: mediaUrls[0], mediaUrls,
        metadatos: { modeloTexto: 'claude-sonnet-5', render: 'html-espacio-carrusel', categoria },
        generadoEn: new Date().toISOString()
      });
      await db.collection('cuentas').doc(cuenta.id).update({
        ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null
      });
      return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
    }

    // Un contador por categoría (no uno global) para que cada tema rote sus propias fotos
    // sin saltarse ninguna, igual que el contador de fotos por máquina de Entre PyMES.
    const campoContador = `tresEstacionesContador_${categoria.replace(/-/g, '_')}`;
    const contador = cuenta[campoContador] || 0;
    const elegida = pool[contador % pool.length];

    const fotoBuffer = await obtenerFotoReal(elegida);
    const texto = await generarTextoEspacio(cuenta, tema, elegida.descripcion);
    const buffer = await renderEspacio({ fotoBuffer, foco: elegida.foco, eyebrow: texto.eyebrow, titulo: texto.titulo, texto: texto.texto, cta: texto.cta });

    const base = `cuentas/${cuenta.slug}/${Date.now()}`;
    const mediaUrl = await subirArchivo(bucket, buffer, `${base}/imagen.png`, 'image/png');

    const contenidoRef = await db.collection('contenido').add({
      cuentaId: cuenta.id, estado: 'pendiente', tipo: 'imagen', tema,
      caption: texto.caption, mediaUrl,
      metadatos: { modeloTexto: 'claude-sonnet-5', render: 'html-espacio-real', categoria, archivoOrigen: elegida.driveFileId },
      generadoEn: new Date().toISOString()
    });
    await db.collection('cuentas').doc(cuenta.id).update({
      ultimaGeneracion: new Date().toISOString(), ultimoTemaIndex: nuevoIndex, regenerarTema: null,
      [campoContador]: contador + 1
    });
    return { cuentaId: cuenta.id, ok: true, contenidoId: contenidoRef.id };
  }

  /* A partir de acá solo llegan cuentas con mediaType 'imagen' simple sin datos reales
     propios (hoy, ninguna activa) — AppsArt/Entre PyMES/Tecno Art/Casa Quinta Tres
     Estaciones ya volvieron antes con su propia rama, cada una con su propio pipeline
     de datos reales. Se deja este fallback genérico (imagen inventada por gpt-image-1)
     por si se suma una cuenta nueva sin fotos/productos propios todavía cargados. */
  const texto = await generarTexto(cuenta, tema);
  const imagenBuffer = await generarImagen(texto.promptImagen);
  const base = `cuentas/${cuenta.slug}/${Date.now()}`;
  const mediaUrl = await subirArchivo(bucket, imagenBuffer, `${base}/imagen.png`, 'image/png');

  const contenidoRef = await db.collection('contenido').add({
    cuentaId: cuenta.id, estado: 'pendiente', tipo: 'imagen', tema,
    caption: texto.caption,
    mediaUrl,
    promptImagen: texto.promptImagen,
    metadatos: { modeloImagen: 'gpt-image-1', modeloTexto: 'claude-sonnet-5' },
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
