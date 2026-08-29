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
   — se reemplaza por la locución+efecto más adelante), y le aplica el tratamiento visual
   retro-futurista elegido por efectos-real-tecnoart.js. -stream_loop -1 + -t 10 cubre los
   dos casos con un solo comando: si el clip real dura menos de 10s, lo repite en loop
   hasta completar; si dura más, lo corta a los primeros 10s.

   Primera versión de este módulo dejaba el video real completamente sin efectos (solo
   escalado/recortado) — el cliente lo notó de inmediato ("no tiene efectos agregados,
   está el video original"). El error era pensar que los 4 tratamientos ya existentes
   (video-tecnoart.js) alcanzaban para todo el pipeline: esos son PROMPTS DE TEXTO para
   Runway, así que no hacían nada cuando no había Runway de por medio. */
async function normalizarVideoReal(buffer, filtroEfecto){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnoart-real-'));
  const entrada = path.join(dir, 'entrada.mov');
  const salida = path.join(dir, 'salida.mp4');
  try{
    fs.writeFileSync(entrada, buffer);
    const filtroBase = `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO}`;
    const vf = filtroEfecto ? `${filtroBase},${filtroEfecto}` : filtroBase;
    await execFileAsync('ffmpeg', [
      '-y', '-stream_loop', '-1', '-i', entrada, '-t', String(DURACION_SEG), '-an',
      '-vf', vf,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', salida
    ]);
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { normalizarVideoReal };
