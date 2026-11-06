// Música del video con Eleven Music (ElevenLabs): instrumental original, con licencia de uso comercial.
// Corre en GitHub Actions con el secret ELEVENLABS_API_KEY (workflow "ReportCar video: voz y fotos").
//   node musica.mjs            -> audio/musica-candidatas/<estilo>.mp3 (un tema por estilo de ESTILOS)
//   node musica.mjs phonk      -> solo ese estilo
// Estilo pedido por Martín: potente, "fierrero", rápido, para video viral de autos. Sin nombrar artistas
// ni películas: se describe el sonido, no se imita un tema existente.
import fs from 'node:fs';

const KEY = process.env.ELEVENLABS_API_KEY;
if(!KEY){ console.log('Falta ELEVENLABS_API_KEY'); process.exit(1); }
const DURACION_MS = 98000;   // un poco más que el video (94 s); render.mjs la corta con fundido
const BASE = 'Instrumental only, no vocals, no lyrics, no voice samples. Made to sit under a spoken voice-over in a fast-paced vertical social media ad for car-repair workshop software: keep the mid frequencies (1-4 kHz) clean and leave space for the voice. Loopable groove, consistent energy, clean punchy mix, ends with a hard hit.';
const ESTILOS = {
  phonk: 'Aggressive drift phonk car-culture track, 140 BPM, heavy distorted 808 bass, cowbell melody, hard trap drums, turbo whoosh risers, street racing night vibe. ' + BASE,
  trap:  'High-energy cinematic trap street-racing beat, 150 BPM half-time feel, booming 808s, crisp hi-hat rolls, dark synth lead, engine-rev style risers and impacts, adrenaline. ' + BASE,
  rock:  'Fast driving electro-rock track for a car commercial, 128 BPM, distorted electric guitar riff, punchy live drums, pulsing synth bass, big energy, motorsport feel. ' + BASE,
};
fs.mkdirSync('audio/musica-candidatas', { recursive: true });
const solo = process.argv.slice(2);
for(const [id, prompt] of Object.entries(ESTILOS)){
  if(solo.length && !solo.includes(id)) continue;
  const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, music_length_ms: DURACION_MS, model_id: 'music_v1', force_instrumental: true }) });
  if(!r.ok){ console.log(id, 'ERROR', r.status, (await r.text()).slice(0, 400)); continue; }
  const f = `audio/musica-candidatas/${id}.mp3`;
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  fs.appendFileSync('audio/musica-candidatas/prompts.txt', `${id}.mp3 | Eleven Music music_v1 | ${prompt}\n`);
  console.log(id, 'ok', (fs.statSync(f).size / 1048576).toFixed(2), 'MB');
}
