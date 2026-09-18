'use strict';
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* Formato vertical (parecido a un post/story de IG) en vez del cuadrado por default. */
async function generarImagen(prompt){
  const res = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'high'
  });
  const b64 = res.data[0].b64_json;
  if(!b64) throw new Error('OpenAI no devolvió b64_json para la imagen.');
  return Buffer.from(b64, 'base64');
}

module.exports = { generarImagen };
