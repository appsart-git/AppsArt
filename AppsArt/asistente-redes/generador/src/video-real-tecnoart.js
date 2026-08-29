'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const ANCHO = 720, ALTO = 1280, DURACION_SEG = 10;

/* Normaliza un video real (filmado con celular, cualquier resolución/duración/audio) al
   mismo formato que espera el resto del pipeline (720x1280, 10s exactos, sin audio propio
   — se reemplaza por la locución+efecto más adelante). -stream_loop -1 + -t 10 cubre los
   dos casos con un solo comando: si el clip real dura menos de 10s, lo repite en loop
   hasta completar; si dura más, lo corta a los primeros 10s. */
async function normalizarVideoReal(buffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnoart-real-'));
  const entrada = path.join(dir, 'entrada.mov');
  const salida = path.join(dir, 'salida.mp4');
  try{
    fs.writeFileSync(entrada, buffer);
    await execFileAsync('ffmpeg', [
      '-y', '-stream_loop', '-1', '-i', entrada, '-t', String(DURACION_SEG), '-an',
      '-vf', `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO}`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', salida
    ]);
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { normalizarVideoReal };
