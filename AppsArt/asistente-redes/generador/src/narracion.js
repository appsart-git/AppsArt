'use strict';
/* NOTA: verificar que ELEVENLABS_VOICE_ID corresponda a una voz en español disponible en la
   cuenta (https://elevenlabs.io/app/voice-library) antes de la primera corrida real —
   el valor por defecto de acá es solo un placeholder. Solo se usa para cuentas con
   mediaType 'imagen+video' (hoy, únicamente Tecno Art). */

const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

async function generarNarracion(guion){
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
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
  return Buffer.from(arrayBuffer);
}

module.exports = { generarNarracion };
