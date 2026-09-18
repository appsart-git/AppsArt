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
   video real, un Buffer ya normalizado por video-real-tecnoart.js (se escribe directo).
   subtitulos: array de {texto,inicio,fin,buffer} (ver narracion.js/subtitulo-tecnoart.js)
   — cada bloque se superpone SOLO durante su propia ventana de tiempo (+0.5s, el mismo
   adelay que se le aplica a la voz más abajo), así el texto va corriendo con la locución
   en vez de ser un cartel fijo todo el video. */
async function mezclarVideoYNarracion(videoUrlOrBuffer, narracionBuffer, sfxBuffer, outroBuffer, subtitulos){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asistente-redes-'));
  const videoPath = path.join(dir, 'video.mp4');
  const audioPath = path.join(dir, 'narracion.mp3');
  const sfxPath = path.join(dir, 'sfx.wav');
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
    const DEMORA_VOZ = 0.5; // igual al adelay=500 aplicado arriba
    if(subtitulos && subtitulos.length > 0){
      const inputs = ['-i', parteAPath];
      subtitulos.forEach((s, i) => {
        const p = path.join(dir, `subtitulo-${i}.png`);
        fs.writeFileSync(p, s.buffer);
        inputs.push('-i', p);
      });
      let cadena = '';
      let etiquetaPrevia = '0:v';
      subtitulos.forEach((s, i) => {
        const etiquetaSalida = i === subtitulos.length - 1 ? 'v' : `v${i}`;
        const inicio = (s.inicio || 0) + DEMORA_VOZ;
        const fin = (s.fin || inicio) + DEMORA_VOZ;
        cadena += `[${etiquetaPrevia}][${i + 1}:v]overlay=0:0:enable='between(t,${inicio},${fin})'[${etiquetaSalida}];`;
        etiquetaPrevia = etiquetaSalida;
      });
      cadena = cadena.slice(0, -1); // saca el ; final
      await execFileAsync('ffmpeg', [
        '-y', ...inputs,
        '-filter_complex', cadena,
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
