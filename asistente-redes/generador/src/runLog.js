'use strict';

async function registrarCorrida(db, resumen){
  await db.collection('runsLog').add(Object.assign({ fecha: new Date().toISOString() }, resumen));
}

module.exports = { registrarCorrida };
