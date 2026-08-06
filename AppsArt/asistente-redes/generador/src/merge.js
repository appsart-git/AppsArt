'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function descargarArchivo(url, destino){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`No se pudo descargar ${url}: ${res.status}`);
  fs.writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
}

/* Reemplaza el audio del clip de Runway (mudo o con música genérica) por la locución de
   ElevenLabs, y saca un frame como poster para el <video poster=""> del dashboard.
   Corre acá (dentro del runner de GitHub Actions, que tiene ffmpeg) en vez de con
   ffmpeg.wasm en el navegador: es más simple porque toda la generación ya pasa por acá. */
async function mezclarVideoYNarracion(videoUrl, narracionBuffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asistente-redes-'));
  const videoPath = path.join(dir, 'video.mp4');
  const audioPath = path.join(dir, 'narracion.mp3');
  const salidaPath = path.join(dir, 'final.mp4');
  const posterPath = path.join(dir, 'poster.jpg');

  try{
    await descargarArchivo(videoUrl, videoPath);
    fs.writeFileSync(audioPath, narracionBuffer);

    await execFileAsync('ffmpeg', [
      '-y', '-i', videoPath, '-i', audioPath,
      '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', salidaPath
    ]);
    await execFileAsync('ffmpeg', ['-y', '-i', salidaPath, '-ss', '00:00:01', '-vframes', '1', posterPath]);

    return {
      videoBuffer: fs.readFileSync(salidaPath),
      posterBuffer: fs.readFileSync(posterPath)
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { mezclarVideoYNarracion };
