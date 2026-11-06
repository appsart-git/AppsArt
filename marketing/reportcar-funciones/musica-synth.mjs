// Base phonk/trap ORIGINAL sintetizada con ffmpeg (sin samples ni temas de terceros), 140 BPM.
// Provisoria hasta tener Eleven Music (musica.mjs). Sale audio/musica.mp3 (~100 s).
//   node musica-synth.mjs
// Capas: bombo con caída de tono en cada negra, 808 distorsionado (F - F - D# - G), hi-hats en
// corcheas y semicorcheas, palmas en 2 y 4, cencerro "phonk" con una frase corta, y un riser cada 8 compases.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const BPM = 140, b = 60 / BPM, BAR = 4 * b, DUR = 100;
const f = n => n.toFixed(5);
// t local dentro de cada negra / corchea / compás
const tb = `mod(t,${f(b)})`, t8 = `mod(t,${f(b / 2)})`, t16 = `mod(t,${f(b / 4)})`;
const bar = `mod(floor(t/${f(BAR)}),4)`;
const intro = `min(1,t/${f(BAR * 2)})`;                      // los primeros 2 compases sube de a poco
const kick = `0.95*exp(-${tb}*14)*sin(2*PI*(48*${tb}+3.2*(1-exp(-${tb}*35))))`;
// 808: nota según el compás, con glide corto al empezar cada media nota y saturación suave
const nota = `if(eq(${bar},2),38.89,if(eq(${bar},3),49,43.65))`;
const th = `mod(t,${f(2 * b)})`;
const s808raw = `1.6*exp(-${th}*1.1)*sin(2*PI*${nota}*t*(1+0.06*exp(-${th}*25)))`;
const s808 = `0.62*(${s808raw})/(1+abs(${s808raw}))`;
const hat = `(0.11*exp(-${t8}*70)+0.05*exp(-${t16}*90)*gt(mod(floor(t/${f(b / 4)}),4),1))*(2*random(0)-1)`;
const tc = `mod(t-${f(b)},${f(2 * b)})`;
const clap = `0.42*exp(-${tc}*22)*(2*random(1)-1)*gt(t,${f(b)})`;
// cencerro: dos tonos inarmónicos (estilo phonk), en algunas corcheas del compás
const pos8 = `mod(floor(t/${f(b / 2)}),8)`;
const hit = `(eq(${pos8},0)+eq(${pos8},3)+eq(${pos8},6))`;
const tono = `if(eq(${bar},2),1.122,if(eq(${bar},3),1.26,1))`;
const bell = `0.16*${hit}*exp(-${t8}*16)*(sgn(sin(2*PI*560*${tono}*t))*0.6+sgn(sin(2*PI*835*${tono}*t))*0.4)*gt(t,${f(BAR * 2)})`;
// riser de ruido en el último compás de cada 8
const t8b = `mod(t,${f(BAR * 8)})`;
const riser = `0.12*gt(${t8b},${f(BAR * 7)})*((${t8b}-${f(BAR * 7)})/${f(BAR)})^2*(2*random(2)-1)`;
const expr = `${intro}*(${kick}+${s808}+${hat}+${clap}+${bell}+${riser})`;

fs.mkdirSync('audio', { recursive: true });
const filtro = `aevalsrc='${expr}':s=44100:d=${DUR},`
  + `highpass=f=28,equalizer=f=2500:t=q:w=1.2:g=-4,`            // hueco en medios para la voz
  + `acompressor=threshold=0.25:ratio=4:attack=5:release=80,`
  + `aecho=0.8:0.4:${f(b * 1000 * 0.75)}:0.12,`                 // eco corto en tempo
  + `afade=t=out:st=${DUR - 2}:d=2,loudnorm=I=-14:TP=-1.5,aformat=channel_layouts=stereo`;
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', filtro, '-ar', '44100', '-b:a', '192k', 'audio/musica.mp3'], { stdio: 'inherit' });
if(r.status) process.exit(r.status);
console.log('audio/musica.mp3 listo');
