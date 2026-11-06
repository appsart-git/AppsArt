// Fotos de los autos para cargar dentro de la demo (no hay fotos libres de estos modelos en Unsplash/Pexels).
// Se generan con la API de imágenes de OpenAI (la misma que usa el pipeline de contenido, gpt-image-1).
// La clave va en OPENAI_API_KEY (corre en GitHub Actions: workflow "ReportCar video: voz y fotos").
//   node fotos.mjs                 -> los 4 autos
//   node fotos.mjs ford-ka         -> solo ese
// Para que los 4 lados sean el MISMO auto: primero se genera el frente y los otros 3 lados se piden como
// edición de esa foto ("el mismo auto, visto de atrás"...). Reglas: sin patente legible, sin personas.
// Salida: fotos/demo/<auto>-<lado>.jpg (1024x768 aprox.) + fotos/demo/prompts.txt (para creditos.txt)
import fs from 'node:fs';

const KEY = process.env.OPENAI_API_KEY;
if(!KEY){ console.log('Falta OPENAI_API_KEY'); process.exit(1); }
// modelo: argumento --modelo=<id> (por defecto el primero gpt-image* que liste la cuenta)
let MODELO = (process.argv.find(a => a.startsWith('--modelo=')) || '').slice(9);
if(process.argv[2] === 'modelos' || !MODELO){
  const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + KEY } });
  const ids = (await r.json()).data.map(m => m.id).filter(id => /image|dall/i.test(id)).sort();
  console.log('modelos de imagen:', ids.join(', '));
  if(process.argv[2] === 'modelos') process.exit(0);
  MODELO = ids.filter(id => /^gpt-image/.test(id)).sort().pop();
  if(!MODELO){ console.log('no hay modelo gpt-image disponible'); process.exit(1); }
}
console.log('modelo:', MODELO);
const AUTOS = {
  'toyota-corolla':  'a silver 2020 Toyota Corolla sedan (twelfth generation, Argentine market)',
  'ford-ka':         'a white 2022 Ford Ka hatchback (second generation, Brazilian/Argentine market)',
  'renault-sandero': 'a dark grey 2018 Renault Sandero hatchback (second generation)',
  'chevrolet-onix':  'a red 2021 Chevrolet Onix hatchback (second generation)',
};
const LADOS = {
  frente:  'seen straight from the front, slightly from above',
  trasera: 'seen straight from the rear',
  izq:     'seen from its left side (driver side, full profile)',
  der:     'seen from its right side (passenger side, full profile)',
};
const REGLAS = 'Realistic smartphone photo taken by a mechanic at the reception area of a small, clean independent car repair workshop in Argentina, daylight, concrete floor, tool cabinets in the background. The whole car is in frame. The license plates are completely blank plain white with no characters at all. No people, no readable text, no logos of other brands.';
const DIR = 'fotos/demo'; fs.mkdirSync(DIR, { recursive: true });
const log = { push: l => fs.appendFileSync(`${DIR}/prompts.txt`, l + '\n') };   // se escribe a medida que sale cada foto

async function api(path, init, intento = 1){
  const r = await fetch('https://api.openai.com/v1/images/' + path, { ...init, headers: { Authorization: 'Bearer ' + KEY, ...(init.headers || {}) } });
  const txt = await r.text(); let j; try{ j = JSON.parse(txt); }catch(e){ j = { error: txt }; }
  if(!r.ok && r.status >= 500 && intento < 3){ console.log('reintento', r.status); await new Promise(s => setTimeout(s, 5000)); return api(path, init, intento + 1); }
  if(!r.ok) throw new Error(`OpenAI ${r.status}: ${JSON.stringify(j.error || j)}`);
  return Buffer.from(j.data[0].b64_json, 'base64');
}
const generar = prompt => api('generations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: MODELO, prompt, size: '1536x1024', quality: 'medium', output_format: 'jpeg', output_compression: 85 }) });
function editar(prompt, ref){
  const fd = new FormData();
  fd.append('model', MODELO); fd.append('prompt', prompt); fd.append('size', '1536x1024'); fd.append('quality', 'medium'); fd.append('output_format', 'jpeg');
  fd.append('image[]', new Blob([ref], { type: 'image/jpeg' }), 'frente.jpg');
  return api('edits', { method: 'POST', body: fd });
}

const solo = process.argv.slice(2).filter(a => !a.startsWith('--'));
for(const [id, desc] of Object.entries(AUTOS)){
  if(solo.length && !solo.includes(id)) continue;
  const pFrente = `${desc}, ${LADOS.frente}. ${REGLAS}`;
  const frente = await generar(pFrente);
  fs.writeFileSync(`${DIR}/${id}-frente.jpg`, frente); log.push(`${id}-frente.jpg | ${MODELO} | ${pFrente}`); console.log(id, 'frente');
  for(const lado of ['trasera', 'izq', 'der']){
    const p = `The exact same car as in the reference photo (same model, color, wheels and condition), in the same workshop, now ${LADOS[lado]}. ${REGLAS}`;
    const img = await editar(p, frente);
    fs.writeFileSync(`${DIR}/${id}-${lado}.jpg`, img); log.push(`${id}-${lado}.jpg | ${MODELO} (edición del frente) | ${p}`); console.log(id, lado);
  }
}
fs.appendFileSync(`${DIR}/prompts.txt`, log.join('\n') + '\n');
