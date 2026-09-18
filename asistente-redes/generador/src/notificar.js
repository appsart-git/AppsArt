'use strict';

async function notificarNtfy(mensaje, titulo){
  const topic = process.env.NTFY_TOPIC;
  if(!topic){ console.log('NTFY_TOPIC no configurado, se omite la notificación.'); return; }
  const res = await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: { 'Title': titulo || 'Asistente de Redes' },
    body: mensaje
  });
  if(!res.ok) console.error(`No se pudo notificar por ntfy: ${res.status} ${await res.text()}`);
}

module.exports = { notificarNtfy };
