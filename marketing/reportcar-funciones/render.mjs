// Render del video con studio.html + ffmpeg.
//   node render.mjs                -> reportcar-funciones-vertical.mp4 (H.264 CRF 23 veryfast + AAC)
//   node render.mjs still 3.2 40   -> out/still-<t>.png (cuadros sueltos para revisar)
//   node render.mjs qr             -> decodifica el QR del último cuadro y lo compara con el link de WhatsApp
// Audio (opcional, si existe):
//   audio/<id escena>.mp3   locución de cada escena (la genera voz.mjs) -> arranca al inicio de su escena
//   audio/musica.mp3        base suave, se baja a MUSICA_DB por debajo de la voz y se corta con fundido
// Sin locuciones el video sale con la pista de audio en silencio (o solo música).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { servir } from './lib/servidor.mjs';

const PORT = 8798, RAIZ = path.resolve('.'), OUT = 'reportcar-funciones-vertical.mp4';
const MUSICA_DB = -16;     // la música (normalizada a -14 LUFS) entra a -30 LUFS aprox. y baja más cuando habla la voz
const [modo, ...resto] = process.argv.slice(2);

const srv = await servir(PORT, RAIZ);
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${PORT}/studio.html?quieto=1`);
await page.waitForFunction(() => document.title.startsWith('READY'), null, { timeout: 60000 });
const TL = await page.evaluate(() => window.__timeline);
console.log(`duración ${TL.duration.toFixed(2)} s`);
fs.writeFileSync('out/timeline.json', JSON.stringify(TL, null, 1));
// textos de la locución (los usa voz.mjs, también en GitHub Actions)
fs.writeFileSync('guion.json', JSON.stringify(TL.scenes.filter(s => s.text).map(s => ({ id: s.id, text: s.text })), null, 1));

try{
  if(modo === 'still'){
    for(const t of resto){
      const url = await page.evaluate(t => window.__frame(t, .95), +t);
      fs.writeFileSync(`out/still-${t}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
      console.log('still', t);
    }
  } else if(modo === 'qr'){
    const jsQR = (await import('jsqr')).default;
    const d = await page.evaluate(() => { const i = window.__qr(); return { w: i.width, h: i.height, data: Array.from(i.data) }; });
    const r = jsQR(Uint8ClampedArray.from(d.data), d.w, d.h);
    console.log(r ? r.data : 'NO DECODIFICA', '\n', r && r.data === TL.waUrl ? 'OK coincide con el link de WhatsApp' : 'NO coincide');
  } else if(modo === 'audio'){
    await encode({ soloAudio: true });
  } else {
    await encode();
  }
} finally { await browser.close(); srv.close(); }

async function encode({ soloAudio = false } = {}){
  const N = Math.round(TL.duration * TL.fps);
  // modo audio: sin video (entrada 0 = silencio) -> out/mezcla.wav + out/stem-voz.wav + out/stem-musica.wav
  const args = soloAudio ? ['-y', '-loglevel', 'error', '-f', 'lavfi', '-t', TL.duration.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo']
    : ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', 'pipe:0'];
  // audio: locuciones en su escena + música.
  // Mezcla "fusionada" (pedido de Martín): la música va fuerte y baja sola cuando habla la voz (sidechain),
  // y vuelve a subir en los silencios; la voz lleva compresión, reverb corta y fundidos de 25 ms, así
  // no corta seco. Al final todo se normaliza a -14 LUFS (volumen de redes).
  const voces = TL.scenes.filter(s => fs.existsSync(`audio/${s.id}.mp3`));
  const musica = fs.existsSync('audio/musica.mp3');
  const filtros = []; let idx = 1;
  voces.forEach(s => {
    args.push('-i', `audio/${s.id}.mp3`);
    const d = (s.voz || 3).toFixed(3);
    filtros.push(`[${idx}]aformat=channel_layouts=stereo:sample_rates=48000,afade=t=in:d=0.025,afade=t=out:st=${Math.max(0, s.voz - .06).toFixed(3)}:d=0.06,adelay=${Math.round(s.start * 1000 + 60)}:all=1[v${idx}]`);
    idx++;
  });
  const D = TL.duration.toFixed(3);
  if(voces.length){
    filtros.push(`${voces.map((_, i) => `[v${i + 1}]`).join('')}amix=inputs=${voces.length}:normalize=0:dropout_transition=0,apad,atrim=0:${D},`
      + `acompressor=threshold=0.12:ratio=3:attack=4:release=120:makeup=1.6,aecho=0.9:0.5:38|71:0.13|0.08,asplit=2[voz][sc]`);
  }
  if(musica){
    args.push('-stream_loop', '-1', '-i', 'audio/musica.mp3');
    filtros.push(`[${idx}]aformat=channel_layouts=stereo:sample_rates=48000,atrim=0:${D},equalizer=f=1800:t=q:w=1:g=-4,equalizer=f=3500:t=q:w=1.2:g=-3,volume=${MUSICA_DB}dB,afade=t=in:d=0.4,afade=t=out:st=${(TL.duration - 2.5).toFixed(2)}:d=2.5[mus0]`);
    if(voces.length) filtros.push(`[mus0][sc]sidechaincompress=threshold=0.015:ratio=4:attack=15:release=450:level_sc=2:makeup=1[mus]`);
    else filtros.push('[mus0]anull[mus]');
  }
  const mezcla = [...(voces.length ? ['[voz]'] : []), ...(musica ? ['[mus]'] : [])];
  if(mezcla.length){
    if(soloAudio && voces.length && musica){
      filtros[filtros.length - 1] = filtros[filtros.length - 1].replace('[mus]', '[mus1]') + ';[mus1]asplit=2[mus][musS]';
      filtros[filtros.findIndex(x => x.endsWith('[voz][sc]'))] = filtros.find(x => x.endsWith('[voz][sc]')).replace('asplit=2[voz][sc]', 'asplit=3[voz][sc][vozS]');
    }
    filtros.push(`${mezcla.join('')}amix=inputs=${mezcla.length}:normalize=0:dropout_transition=0,atrim=0:${D},loudnorm=I=-14:TP=-1.2:LRA=9[a]`);
    if(soloAudio){
      args.push('-filter_complex', filtros.join(';'), '-map', '[a]', 'out/mezcla.wav');
      if(voces.length && musica) args.push('-map', '[vozS]', 'out/stem-voz.wav', '-map', '[musS]', 'out/stem-musica.wav');
      const ffa = spawn('ffmpeg', args, { stdio: 'inherit' }); await new Promise(res => ffa.on('close', res)); console.log('out/mezcla.wav + stems'); return;
    }
    args.push('-filter_complex', filtros.join(';'), '-map', '0:v', '-map', '[a]');
  } else {
    args.push('-f', 'lavfi', '-t', D, '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', `${idx}:a`);
  }
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', String(TL.fps),
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', '-t', TL.duration.toFixed(3), OUT);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for(let i = 0; i < N; i++){
    const url = await page.evaluate(t => window.__frame(t), i / TL.fps);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if(!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if(i % 150 === 0) console.log(`cuadro ${i}/${N}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  const mb = fs.statSync(OUT).size / 1048576;
  console.log(`${OUT}: ${mb.toFixed(2)} MB, ${voces.length} locuciones, música: ${musica ? 'sí' : 'no'}, ${((Date.now() - t0) / 1000) | 0} s`);
  if(mb >= 16) console.log('OJO: pesa 16 MB o más');
}
