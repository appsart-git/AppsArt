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

async function generarNarracion(guion){
  const voz = VOCES[Math.floor(Math.random() * VOCES.length)];

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: guion,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if(!res.ok) throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`);
  const arrayBuffer = await res.arrayBuffer();
  return { audioBuffer: Buffer.from(arrayBuffer), voz: voz.nombre };
}

module.exports = { generarNarracion };
