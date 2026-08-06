'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* Devuelve {caption, promptImagen} y, si la cuenta también genera video,
   además {guion, promptVideo}. Todo en un solo llamado para que el guion
   y la imagen salgan coherentes entre sí (mismo tema, mismo tono). */
async function generarTexto(cuenta, tema){
  const necesitaVideo = cuenta.mediaType === 'imagen+video';

  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}).
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Identidad visual: ${cuenta.identidadVisual || '-'}
Hashtags base disponibles: ${(cuenta.hashtagsBase || []).join(' ') || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Generá contenido para un posteo de Instagram sobre este tema/colección: "${tema}".

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final",
  "promptImagen": "prompt en inglés, detallado, para un generador de imágenes, coherente con la identidad visual de la marca"${necesitaVideo ? `,
  "guion": "guion narrado en español, pensado para 10 a 20 segundos hablados, para un reel corto",
  "promptVideo": "prompt en inglés, detallado, describiendo la escena/movimiento de cámara para un generador de video"` : ''}
}`.trim();

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let data;
  try{
    data = JSON.parse(jsonStr);
  }catch(e){
    throw new Error(`No se pudo parsear la respuesta de Claude como JSON: ${e.message}. Respuesta cruda: ${raw.slice(0,300)}`);
  }
  if(!data.caption || !data.promptImagen) throw new Error('La respuesta de Claude no tiene caption/promptImagen.');
  if(necesitaVideo && (!data.guion || !data.promptVideo)) throw new Error('La respuesta de Claude no tiene guion/promptVideo para una cuenta con video.');
  return data;
}

module.exports = { generarTexto };
