'use strict';
const fs = require('fs');
const path = require('path');

/* Efectos de interferencia/glitch reales (bancos de sonido libres, Pixabay/Freesound,
   uso comercial permitido), recortados en fragmentos cortos de un puñado de archivos
   más largos para tener variedad. Se sortea uno al azar por reel — mismo criterio de
   variedad que las 4 variantes visuales y las 5 voces de narración. */
const SFX_DIR = path.join(__dirname, '../sfx');

const ARCHIVOS = [
  'vhs-hum-1.wav', 'vhs-hum-2.wav', 'vhs-hum-3.wav',
  'glitch-pattern-1.wav',
  'static-grittier-1.wav', 'static-grittier-2.wav', 'static-grittier-3.wav', 'static-grittier-4.wav',
  'continuous-static-1.wav',
  'wave-interference-1.wav',
  'radio-static-1.wav',
  'electronic-interference-1.wav', 'electronic-interference-2.wav', 'electronic-interference-3.wav',
  'electronic-interference-4.wav', 'electronic-interference-5.wav'
];

function elegirSfx(){
  const archivo = ARCHIVOS[Math.floor(Math.random() * ARCHIVOS.length)];
  return { buffer: fs.readFileSync(path.join(SFX_DIR, archivo)), nombre: archivo };
}

module.exports = { elegirSfx };
