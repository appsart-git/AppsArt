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
   real era una foto o un frame de video. */
async function obtenerFotoReal({ driveFileId, tipo, timestampSeg }){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tresestaciones-foto-'));
  const entrada = path.join(dir, 'entrada');
  const salida = path.join(dir, 'salida.jpg');
  try{
    const buffer = await descargarDriveArchivo(driveFileId);
    fs.writeFileSync(entrada, buffer);

    const args = tipo === 'video'
      ? ['-y', '-ss', String(timestampSeg || 1), '-i', entrada, '-map', '0:v:0', '-update', '1', '-vframes', '1', '-q:v', '2', salida]
      : ['-y', '-i', entrada, '-map', '0:v:0', '-update', '1', '-q:v', '2', salida];

    await execFileAsync('ffmpeg', args);
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { obtenerFotoReal };
