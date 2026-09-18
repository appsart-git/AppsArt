'use strict';

async function subirArchivo(bucket, buffer, destPath, contentType){
  const file = bucket.file(destPath);
  await file.save(buffer, {
    contentType, public: true,
    // La URL es del bucket de GCS directo (sin CORS habilitado), así que ni fetch()
    // desde el dashboard ni el truco de ?response-content-disposition (solo funciona
    // con URLs firmadas) sirven para forzar la descarga. Guardando este header en los
    // METADATOS del archivo, el propio servidor lo manda en cada respuesta — funciona
    // con una navegación común y no depende de CORS ni de firmar la URL. No afecta la
    // reproducción inline en el <video>/<img> del dashboard (Content-Disposition solo
    // importa para navegación directa, no para carga de un elemento de media).
    metadata: { cacheControl: 'public, max-age=31536000', contentDisposition: 'attachment' }
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
}

module.exports = { subirArchivo };
