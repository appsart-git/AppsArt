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
const MUSICA_DB = -22;     // música respecto de la voz (brief: -20 a -24 dB)
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
  } else {
    await encode();
  }
} finally { await browser.close(); srv.close(); }

async function encode(){
  const N = Math.round(TL.duration * TL.fps);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', 'pipe:0'];
  // audio: locuciones en su escena + música
  const voces = TL.scenes.filter(s => fs.existsSync(`audio/${s.id}.mp3`));
  const musica = fs.existsSync('audio/musica.mp3');
  const filtros = []; let idx = 1;
  voces.forEach(s => { args.push('-i', `audio/${s.id}.mp3`); filtros.push(`[${idx}]adelay=${Math.round(s.start * 1000 + 60)}:all=1[v${idx}]`); idx++; });
  if(musica){
    args.push('-stream_loop', '-1', '-i', 'audio/musica.mp3');
    filtros.push(`[${idx}]atrim=0:${TL.duration.toFixed(2)},volume=${MUSICA_DB}dB,afade=t=in:d=1,afade=t=out:st=${(TL.duration - 2).toFixed(2)}:d=2[mus]`);
  }
  const mezcla = [...voces.map((_, i) => `[v${i + 1}]`), ...(musica ? ['[mus]'] : [])];
  if(mezcla.length){
    filtros.push(`${mezcla.join('')}amix=inputs=${mezcla.length}:normalize=0:dropout_transition=0,apad,atrim=0:${TL.duration.toFixed(3)}[a]`);
    args.push('-filter_complex', filtros.join(';'), '-map', '0:v', '-map', '[a]');
  } else {
    args.push('-f', 'lavfi', '-t', TL.duration.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', `${idx}:a`);
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
