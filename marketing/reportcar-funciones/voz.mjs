// Locución con ElevenLabs (la clave va en la variable de entorno ELEVENLABS_API_KEY, nunca en el repo).
//   node voz.mjs buscar               -> lista voces de la Voice Library: español, Argentina, masculina, joven
//   node voz.mjs candidatas id1 id2 id3 -> audio/candidatas/<id>-s0.mp3 y -s1.mp3 para que Martín elija
//   node voz.mjs todo <voice_id>      -> audio/<escena>.mp3 de todas las escenas + audio/duraciones.json
//   node voz.mjs todo <voice_id> s4 s7 -> regenera solo esas escenas
// El texto de cada escena sale de guion.json (lo escribe render.mjs desde studio.html), o sea, el titular de studio.html
// sin asteriscos: lo que dice la voz es palabra por palabra lo que está en pantalla. Solo para la voz se
// corrige la pronunciación con FONETICA (en pantalla queda el texto normal).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const KEY = process.env.ELEVENLABS_API_KEY;
if(!KEY){ console.log('Falta ELEVENLABS_API_KEY'); process.exit(1); }
const MODELO = 'eleven_multilingual_v2';
const AJUSTES = { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.08 };  // velocidad: 1.05 a 1.1
const FONETICA = [   // se ajusta después de escuchar las candidatas
  [/WhatsApp/g, 'guatsáp'],
  [/\bQR\b/g, 'cu erre'],
  [/\bPDF\b/g, 'pe de efe'],
  [/ReportCar/g, 'Ríport Car'],
  [/AppsArt/g, 'Aps Art'],
];
const paraVoz = t => FONETICA.reduce((s, [a, b]) => s.replace(a, b), t.replace(/\*/g, ''));
const H = { 'xi-api-key': KEY, 'Content-Type': 'application/json' };

const [modo, ...args] = process.argv.slice(2);
const escenas = JSON.parse(fs.readFileSync('guion.json', 'utf8'));
fs.mkdirSync('audio/candidatas', { recursive: true });

async function tts(voz, texto, archivo){
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}?output_format=mp3_44100_128`, {
    method: 'POST', headers: H, body: JSON.stringify({ text: texto, model_id: MODELO, voice_settings: AJUSTES, language_code: 'es' }) });
  if(!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
}
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

if(modo === 'buscar'){
  const q = new URLSearchParams({ page_size: '30', language: 'es', accent: 'argentine', gender: 'male', age: 'young' });
  const r = await fetch('https://api.elevenlabs.io/v1/shared-voices?' + q, { headers: H });
  const j = await r.json();
  for(const v of j.voices || []) console.log(v.voice_id, '|', v.name, '|', v.accent, v.age, '|', (v.description || '').slice(0, 90), '|', v.preview_url);
} else if(modo === 'candidatas'){
  for(const voz of args) for(const s of escenas.slice(0, 2)){
    const f = `audio/candidatas/${voz}-${s.id}.mp3`; await tts(voz, paraVoz(s.text), f); console.log(f, dur(f).toFixed(2), 's');
  }
} else if(modo === 'todo'){
  const [voz, ...solo] = args;
  const dj = fs.existsSync('audio/duraciones.json') ? JSON.parse(fs.readFileSync('audio/duraciones.json', 'utf8')) : {};
  for(const s of escenas){
    if(solo.length && !solo.includes(s.id)) continue;
    const f = `audio/${s.id}.mp3`; await tts(voz, paraVoz(s.text), f);
    dj[s.id] = +dur(f).toFixed(3); console.log(s.id, dj[s.id], 's |', paraVoz(s.text));
  }
  dj._voz = voz; fs.writeFileSync('audio/duraciones.json', JSON.stringify(dj, null, 1));
  console.log('listo: correr node render.mjs');
} else console.log('modos: buscar | candidatas <ids> | todo <voice_id> [escenas]');
