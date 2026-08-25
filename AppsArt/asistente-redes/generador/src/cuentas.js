'use strict';
/* La cadencia vive en el dato de cada cuenta (cadenciaDias), no en el cron del workflow.
   Así, sumar una cuenta nueva (propia o de un futuro cliente de AppsArt) es solo
   completar el formulario en el dashboard — nunca hay que tocar el workflow. */

async function cuentasActivas(db){
  const snap = await db.collection('cuentas').where('activo', '==', true).get();
  const cuentas = [];
  snap.forEach(doc => cuentas.push(Object.assign({ id: doc.id }, doc.data())));
  return cuentas;
}

async function cuentasVencidas(db){
  const hoy = Date.now();
  const cuentas = await cuentasActivas(db);
  return cuentas.filter(c => {
    const ultimaMs = c.ultimaGeneracion ? new Date(c.ultimaGeneracion).getTime() : 0;
    const diasPasados = (hoy - ultimaMs) / 86400000;
    return diasPasados >= (c.cadenciaDias || 3);
  });
}

function proximoTema(cuenta){
  const temas = cuenta.temasContenido || [];
  if(temas.length === 0) return { tema: cuenta.rubro || cuenta.nombre, nuevoIndex: 0 };
  const idx = (cuenta.ultimoTemaIndex || 0) % temas.length;
  return { tema: temas[idx], nuevoIndex: (idx + 1) % temas.length };
}

module.exports = { cuentasActivas, cuentasVencidas, proximoTema };
