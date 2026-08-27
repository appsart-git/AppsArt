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
   ElevenLabs, con el efecto de interferencia de fondo, y opcionalmente le pega atrás un
   cierre de marca (logo real, ver logo-outro.js). Corre acá (dentro del runner de GitHub
   Actions, que tiene ffmpeg) en vez de con ffmpeg.wasm en el navegador: es más simple
   porque toda la generación ya pasa por acá.

   Ajuste tras la primera corrida real: el efecto arrancaba junto con la voz y la tapaba,
   y un guion más corto que el video de 10s terminaba recortando el video entero (porque
   antes se usaba amix con duration=first, y -shortest contra un audio ya acotado a la voz).
   Ahora la voz arranca con un pequeño retraso (el efecto "abre" el clip solo), el efecto se
   apaga con un fade en vez de sonar parejo, y el audio se rellena con silencio (apad) antes
   de recortar contra el video — así el clip de producto SIEMPRE dura los 10s completos. */
async function mezclarVideoYNarracion(videoUrl, narracionBuffer, sfxBuffer, outroBuffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asistente-redes-'));
  const videoPath = path.join(dir, 'video.mp4');
  const audioPath = path.join(dir, 'narracion.mp3');
  const sfxPath = path.join(dir, 'sfx.wav');
  const parteAPath = path.join(dir, 'parteA.mp4');
  const outroPath = path.join(dir, 'outro.mp4');
  const salidaPath = path.join(dir, 'final.mp4');
  const posterPath = path.join(dir, 'poster.jpg');

  try{
    await descargarArchivo(videoUrl, videoPath);
    fs.writeFileSync(audioPath, narracionBuffer);

    if(sfxBuffer){
      fs.writeFileSync(sfxPath, sfxBuffer);
      await execFileAsync('ffmpeg', [
        '-y', '-i', videoPath, '-i', audioPath, '-i', sfxPath,
        '-filter_complex',
        '[1:a]adelay=500|500,volume=1.0[voz];' +
        '[2:a]volume=0.22,afade=t=out:st=0.6:d=1.4[sfx];' +
        '[voz][sfx]amix=inputs=2:duration=longest:dropout_transition=0,apad[aout]',
        '-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy', '-shortest', parteAPath
      ]);
    } else {
      await execFileAsync('ffmpeg', [
        '-y', '-i', videoPath, '-i', audioPath,
        '-filter_complex', '[1:a]adelay=500|500,apad[aout]',
        '-map', '0:v:0', '-map', '[aout]', '-c:v', 'copy', '-shortest', parteAPath
      ]);
    }

    let finalPath = parteAPath;
    if(outroBuffer){
      fs.writeFileSync(outroPath, outroBuffer);
      await execFileAsync('ffmpeg', [
        '-y', '-i', parteAPath, '-i', outroPath,
        '-filter_complex', '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]',
        '-map', '[v]', '-map', '[a]', salidaPath
      ]);
      finalPath = salidaPath;
    }

    await execFileAsync('ffmpeg', ['-y', '-i', finalPath, '-ss', '00:00:01', '-vframes', '1', posterPath]);

    return {
      videoBuffer: fs.readFileSync(finalPath),
      posterBuffer: fs.readFileSync(posterPath)
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { mezclarVideoYNarracion };
