'use strict';
/* La cadencia vive en el dato de cada cuenta (cadenciaDias), no en el cron del workflow.
   Así, sumar una cuenta nueva (propia o de un futuro cliente de AppsArt) es solo
   completar el formulario en el dashboard — nunca hay que tocar el workflow. */

async function cuentasVencidas(db){
  const snap = await db.collection('cuentas').where('activo', '==', true).get();
  const hoy = Date.now();
  const cuentas = [];
  snap.forEach(doc => {
    const c = Object.assign({ id: doc.id }, doc.data());
    const ultimaMs = c.ultimaGeneracion ? new Date(c.ultimaGeneracion).getTime() : 0;
    const diasPasados = (hoy - ultimaMs) / 86400000;
    if(diasPasados >= (c.cadenciaDias || 3)) cuentas.push(c);
  });
  return cuentas;
}

function proximoTema(cuenta){
  const temas = cuenta.temasContenido || [];
  if(temas.length === 0) return { tema: cuenta.rubro || cuenta.nombre, nuevoIndex: 0 };
  const idx = (cuenta.ultimoTemaIndex || 0) % temas.length;
  return { tema: temas[idx], nuevoIndex: (idx + 1) % temas.length };
}

module.exports = { cuentasVencidas, proximoTema };
