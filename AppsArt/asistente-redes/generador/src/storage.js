'use strict';

async function subirArchivo(bucket, buffer, destPath, contentType){
  const file = bucket.file(destPath);
  await file.save(buffer, { contentType, public: true, metadata: { cacheControl: 'public, max-age=31536000' } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
}

module.exports = { subirArchivo };
