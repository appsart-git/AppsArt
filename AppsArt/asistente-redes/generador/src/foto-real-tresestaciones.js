'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { descargarDriveArchivo } = require('./drive');

/* A diferencia de Tecno Art (siempre video de 10s), acá el banco real de Casa Quinta
   Tres Estaciones es un dump crudo de fotos/videos de celular sin normalizar: fotos en
   HEIC/JPG/PNG y videos MOV/MP4 de duración variable, de los que solo un instante puntual
   sirve como foto (ej. el segundo exacto en que se ve el horno de barro encendido). Por
   eso cada entrada de tresestaciones-fotos.json declara su propio `tipo` ('foto'|'video')
   y, si es video, el `timestampSeg` exacto a extraer — no hay un criterio único como el
   "10s siempre" de Tecno Art.

   Se normaliza siempre a JPEG vía ffmpeg (no solo para los HEIC): así el resto del
   pipeline (renderEspacio.js) recibe siempre el mismo formato sin importar si la fuente
   real era una foto o un frame de video.

   El -ss va DESPUÉS de -i (seek preciso, decodifica desde el arranque) y no antes (seek
   rápido, salta al keyframe más cercano) — con -ss antes de -i, varios de estos videos de
   celular devolvían un frame corrupto/con artefactos de compresión en vez del instante
   exacto pedido (se notó en un posteo real: el frame de "el quincho" salió borroso e
   irreconocible pese a que el timestamp era el correcto). Es más lento por decodificar
   desde el inicio, pero acá se extrae un solo frame por generación, así que el costo es
   insignificante.

   EMBELLECER: son fotos crudas de celular, muchas grises/apagadas (día nublado, poca luz).
   El cliente pidió "embellecer" las fotos — se aplica una corrección de color pareja y
   sutil (contraste/saturación/gamma + un enfoque leve), nunca generativa: sigue siendo la
   foto real, solo mejor expuesta. Valores conservadores a propósito (ver test-embellecer-*
   comparados a mano): un poco más y empieza a verse artificial/oversaturado. */
const FILTRO_EMBELLECER = 'eq=contrast=1.10:brightness=0.02:saturation=1.18:gamma=1.05,unsharp=5:5:0.6';

async function obtenerFotoReal({ driveFileId, tipo, timestampSeg }){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tresestaciones-foto-'));
  const entrada = path.join(dir, 'entrada');
  const salida = path.join(dir, 'salida.jpg');
  try{
    const buffer = await descargarDriveArchivo(driveFileId);
    fs.writeFileSync(entrada, buffer);

    const args = tipo === 'video'
      ? ['-y', '-i', entrada, '-ss', String(timestampSeg || 1), '-map', '0:v:0', '-update', '1', '-vframes', '1', '-vf', FILTRO_EMBELLECER, '-q:v', '2', salida]
      : ['-y', '-i', entrada, '-map', '0:v:0', '-update', '1', '-vf', FILTRO_EMBELLECER, '-q:v', '2', salida];

    await execFileAsync('ffmpeg', args);
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { obtenerFotoReal };
