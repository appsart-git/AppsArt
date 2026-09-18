'use strict';
/* NOTA: la API de Runway cambia de tanto en tanto de endpoint/parámetros — de hecho
   'gen3a_turbo' y el ratio '768:1280' que tenía este archivo ANTES ya no son valores
   válidos (verificado contra https://docs.dev.runwayml.com el 2026-08-27). Antes de la
   primera corrida real de una cuenta con video, re-verificar este módulo contra esa doc
   y ajustar si hace falta. Solo se usa para cuentas con mediaType 'imagen+video'
   (hoy, únicamente Tecno Art). */

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_VERSION = '2024-11-06';

/* promptImagen: URL https real de la foto del producto (Runway acepta la URL directamente,
   no hace falta bajarla ni convertirla a base64 — ver docs.dev.runwayml.com). */
async function generarVideo(prompt, promptImagen){
  const startRes = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_VERSION
    },
    body: JSON.stringify({
      // Se probó gen4.5 (más caro) para más energía visual, pero alucinaba contenido
      // que no era el producto real (ej. convirtió el dibujo estampado de un pibe
      // descalzo en un primer plano de pies "reales") — se vuelve a gen4_turbo, que es
      // fiel a la foto real, y la energía se resuelve con cortes rápidos + x1.25 (ver
      // video-tecnoart.js y merge.js) en vez de con un modelo más creativo/impredecible.
      model: 'gen4_turbo',
      promptImage: promptImagen,
      promptText: prompt,
      duration: 10,
      ratio: '720:1280'
    })
  });
  if(!startRes.ok) throw new Error(`Runway (inicio de tarea): ${startRes.status} ${await startRes.text()}`);
  const { id } = await startRes.json();
  if(!id) throw new Error('Runway no devolvió un id de tarea.');

  // Runway procesa el video de forma asíncrona: hay que consultar hasta que termine.
  for(let intento = 0; intento < 60; intento++){
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`${RUNWAY_API_BASE}/tasks/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'X-Runway-Version': RUNWAY_VERSION
      }
    });
    if(!pollRes.ok) throw new Error(`Runway (consulta de tarea): ${pollRes.status} ${await pollRes.text()}`);
    const data = await pollRes.json();
    if(data.status === 'SUCCEEDED') return data.output[0];
    if(data.status === 'FAILED') throw new Error(`Runway: la tarea falló (${data.failure || 'sin detalle'}).`);
  }
  throw new Error('Runway: se agotó el tiempo de espera del video (5 minutos).');
}

module.exports = { generarVideo };
