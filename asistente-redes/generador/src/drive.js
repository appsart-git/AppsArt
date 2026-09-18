'use strict';
/* Descarga un archivo público de Google Drive por su fileId. Para archivos grandes,
   Drive devuelve una página HTML de "no se puede escanear por virus" en vez del archivo
   directo — hay que parsear el formulario de esa página (action/id/export/confirm/uuid)
   y volver a pedir con esos parámetros. Mismo mecanismo ya usado a mano en esta sesión
   para bajar los videos de referencia reales de las cuentas. */
async function descargarDriveArchivo(fileId){
  const primeraUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res1 = await fetch(primeraUrl);
  const tipo = res1.headers.get('content-type') || '';

  if(!tipo.includes('text/html')){
    return Buffer.from(await res1.arrayBuffer());
  }

  const html = await res1.text();
  const accion = (html.match(/action="([^"]+)"/) || [])[1];
  const uuid = (html.match(/name="uuid" value="([^"]+)"/) || [])[1];
  const confirm = (html.match(/name="confirm" value="([^"]+)"/) || [])[1] || 't';
  if(!accion){
    throw new Error(`No se pudo descargar de Drive (fileId ${fileId}): no vino el archivo ni el formulario de confirmación esperado.`);
  }
  const params = new URLSearchParams({ id: fileId, export: 'download', confirm });
  if(uuid) params.set('uuid', uuid);
  const res2 = await fetch(`${accion}?${params.toString()}`);
  if(!res2.ok) throw new Error(`Drive (confirmación, fileId ${fileId}): ${res2.status}`);
  return Buffer.from(await res2.arrayBuffer());
}

module.exports = { descargarDriveArchivo };
