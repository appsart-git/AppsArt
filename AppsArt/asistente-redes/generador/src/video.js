'use strict';
/* NOTA: la API de Runway (Gen-3/Gen-4) cambia de tanto en tanto de endpoint/parámetros —
   antes de la primera corrida real de una cuenta con video, verificar este módulo contra
   https://docs.dev.runwayml.com (sección image_to_video) y ajustar si hace falta.
   Solo se usa para cuentas con mediaType 'imagen+video' (hoy, únicamente Tecno Art). */

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_VERSION = '2024-11-06';

async function generarVideo(prompt, imagenBuffer){
  const imagenB64 = `data:image/png;base64,${imagenBuffer.toString('base64')}`;

  const startRes = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_VERSION
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptImage: imagenB64,
      promptText: prompt,
      duration: 10,
      ratio: '768:1280'
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
