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
   ElevenLabs, con el efecto de interferencia de fondo, quema el subtítulo del guion,
   le pega atrás el cierre de marca (logo real) y acelera el resultado final. Corre acá
   (dentro del runner de GitHub Actions, que tiene ffmpeg) en vez de con ffmpeg.wasm en
   el navegador: es más simple porque toda la generación ya pasa por acá.

   Ajustes tras las corridas reales:
   1) el efecto arrancaba junto con la voz y la tapaba, y un guion más corto que el video
      de 10s terminaba recortando el video entero (antes se usaba amix con duration=first,
      y -shortest contra un audio ya acotado a la voz) — ahora la voz arranca con un
      pequeño retraso, el efecto se apaga con un fade, y el audio se rellena con silencio
      (apad) antes de recortar contra el video, así el clip de producto SIEMPRE dura los
      10s completos.
   2) seguía sintiéndose lento/sin energía — el cliente probó a mano ponerlo en velocidad
      x1.25 y mejoró mucho (después pidió subirlo más, a x1.4), así que ahora se aplica
      siempre al resultado final (setpts para el video, atempo para el audio — atempo
      preserva el tono de la voz, no sube el pitch como un simple resample). */
/* videoUrlOrBuffer: URL del clip de Runway (se descarga acá) o, para productos con
   video real, un Buffer ya normalizado por video-real-tecnoart.js (se escribe directo). */
async function mezclarVideoYNarracion(videoUrlOrBuffer, narracionBuffer, sfxBuffer, outroBuffer, subtituloBuffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asistente-redes-'));
  const videoPath = path.join(dir, 'video.mp4');
  const audioPath = path.join(dir, 'narracion.mp3');
  const sfxPath = path.join(dir, 'sfx.wav');
  const subPath = path.join(dir, 'subtitulo.png');
  const parteAPath = path.join(dir, 'parteA.mp4');
  const parteASubPath = path.join(dir, 'parteA-sub.mp4');
  const outroPath = path.join(dir, 'outro.mp4');
  const concatPath = path.join(dir, 'concat.mp4');
  const veloz = path.join(dir, 'final.mp4');
  const posterPath = path.join(dir, 'poster.jpg');

  try{
    if(Buffer.isBuffer(videoUrlOrBuffer)){
      fs.writeFileSync(videoPath, videoUrlOrBuffer);
    } else {
      await descargarArchivo(videoUrlOrBuffer, videoPath);
    }
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

    let cuerpoPath = parteAPath;
    if(subtituloBuffer){
      fs.writeFileSync(subPath, subtituloBuffer);
      await execFileAsync('ffmpeg', [
        '-y', '-i', parteAPath, '-i', subPath,
        '-filter_complex', '[0:v][1:v]overlay=0:0[v]',
        '-map', '[v]', '-map', '0:a', '-c:a', 'copy', parteASubPath
      ]);
      cuerpoPath = parteASubPath;
    }

    let finalSinVelocidad = cuerpoPath;
    if(outroBuffer){
      fs.writeFileSync(outroPath, outroBuffer);
      await execFileAsync('ffmpeg', [
        '-y', '-i', cuerpoPath, '-i', outroPath,
        '-filter_complex', '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]',
        '-map', '[v]', '-map', '[a]', concatPath
      ]);
      finalSinVelocidad = concatPath;
    }

    // x1.4: probado a mano por el cliente (empezó en x1.25, pidió subirlo a x1.4).
    await execFileAsync('ffmpeg', [
      '-y', '-i', finalSinVelocidad,
      '-filter_complex', '[0:v]setpts=PTS/1.4[v];[0:a]atempo=1.4[a]',
      '-map', '[v]', '-map', '[a]', veloz
    ]);

    await execFileAsync('ffmpeg', ['-y', '-i', veloz, '-ss', '00:00:01', '-vframes', '1', posterPath]);

    return {
      videoBuffer: fs.readFileSync(veloz),
      posterBuffer: fs.readFileSync(posterPath)
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { mezclarVideoYNarracion };
