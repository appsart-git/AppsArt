'use strict';
/* Voces reales elegidas por el cliente en la librería de ElevenLabs (español
   latinoamericano/argentino, acordes al público joven-adulto de Tecno Art). Se sortea
   una al azar por reel (no siempre la misma) — mismo criterio de variedad que las
   4 variantes visuales de video-tecnoart.js, aplicado a la narración. */
const VOCES = [
  { id: 'p7AwDmKvTdoHTBuueGvP', nombre: 'Kate' },
  { id: 'zR7eV8hMFnxhSSAcCYW0', nombre: 'Martín Álvarez' },
  { id: 'vgekQLm3GYiKMHUnPVvY', nombre: 'Regis' },
  { id: 'Wl3O9lmFSMgGFTTwuS6f', nombre: 'Agus' },
  { id: 'AqTsqzKuY71B3KFBr39g', nombre: 'Malena' }
];

const PALABRAS_POR_BLOQUE = 3;

/* Junta los timestamps por carácter que devuelve ElevenLabs en bloques cortos de
   palabras (para subtítulos que van corriendo con la voz, no un cartel fijo todo el
   video). Cada bloque guarda su propio inicio/fin real, tomados del primer y último
   carácter que lo componen. */
function armarBloquesSubtitulo(alignment){
  if(!alignment || !Array.isArray(alignment.characters)) return [];
  const { characters, character_start_times_seconds: inicios, character_end_times_seconds: fines } = alignment;

  const palabras = [];
  let actual = '', inicioActual = null;
  for(let i = 0; i < characters.length; i++){
    const c = characters[i];
    if(c.trim() === ''){
      if(actual){ palabras.push({ texto: actual, inicio: inicioActual, fin: fines[i - 1] }); actual = ''; inicioActual = null; }
    } else {
      if(!actual) inicioActual = inicios[i];
      actual += c;
    }
  }
  if(actual) palabras.push({ texto: actual, inicio: inicioActual, fin: fines[characters.length - 1] });

  const bloques = [];
  for(let i = 0; i < palabras.length; i += PALABRAS_POR_BLOQUE){
    const grupo = palabras.slice(i, i + PALABRAS_POR_BLOQUE);
    bloques.push({
      texto: grupo.map(p => p.texto).join(' '),
      inicio: grupo[0].inicio,
      fin: grupo[grupo.length - 1].fin
    });
  }
  return bloques;
}

async function generarNarracion(guion){
  const voz = VOCES[Math.floor(Math.random() * VOCES.length)];

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz.id}/with-timestamps`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: guion,
      model_id: 'eleven_multilingual_v2',
      // Segunda vuelta de feedback: seguía faltando energía incluso con stability
      // 0.28/style 0.6 — se lleva al límite alto de expresividad que soporta el modelo.
      voice_settings: { stability: 0.18, similarity_boost: 0.75, style: 0.9, use_speaker_boost: true }
    })
  });
  if(!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if(!data.audio_base64) throw new Error('ElevenLabs (with-timestamps) no devolvió audio_base64.');

  return {
    audioBuffer: Buffer.from(data.audio_base64, 'base64'),
    voz: voz.nombre,
    subtitulos: armarBloquesSubtitulo(data.alignment)
  };
}

module.exports = { generarNarracion };
