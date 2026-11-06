// Preparación de cada toma: deja la demo en el mismo estado de partida y le carga las fotos de los autos.
//   1. "Reiniciar datos de ejemplo": se borran las claves tutaller:* (es lo mismo que hace el botón de
//      Config → "↺ Reiniciar datos de ejemplo") y se recarga, así la demo vuelve a sembrar sus datos.
//   2. Se cargan las fotos de los 4 lados en las actas de los 3 autos que ya están en el taller, para que
//      las tarjetas de Ingreso no digan "📷 0 fotos" y el informe salga con foto.
// Las fotos salen de fotos/demo/<auto>-<lado>.jpg (ver AUTOS_TALLER). Si falta alguna, se sigue sin ella.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const FOTOS_DEMO = path.resolve(AQUI, '../fotos/demo');
export const LADOS = ['frente', 'trasera', 'izq', 'der'];

// patente del seed -> prefijo de archivo en fotos/demo/
export const AUTOS_TALLER = { AF221QW: 'ford-ka', AE045LM: 'renault-sandero', AG556RT: 'chevrolet-onix' };
// el auto que entra en la escena 1 (no está en el seed: se carga en la toma)
export const AUTO_NUEVO = { prefijo: 'toyota-corolla', nombre: 'Martina Ruiz', telefono: '1155550188', patente: 'AD517TR',
  marca: 'Toyota', modelo: 'Corolla', anio: '2020', km: '73.410', combustible: 2,
  motivo: 'Service de los 75.000 km y vibración al frenar' };

export function fotoDataUrl(prefijo, lado){
  const f = path.join(FOTOS_DEMO, `${prefijo}-${lado}.jpg`);
  if(!fs.existsSync(f)) return null;
  return 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
}
export function fotosDe(prefijo){
  const o = {};
  for(const l of LADOS){ const u = fotoDataUrl(prefijo, l); if(u) o[l] = u; }
  return o;
}

export async function preparar(page, base){
  await page.goto(base);
  await page.waitForFunction(() => typeof state !== 'undefined' && state.loaded && state.loaded.ingresos);
  // 1. reiniciar datos de ejemplo
  await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tutaller:')).forEach(k => localStorage.removeItem(k)));
  await page.reload();
  await page.waitForFunction(() => typeof state !== 'undefined' && state.loaded && state.loaded.ingresos && state.ingresos.length > 0);
  // 2. fotos de los autos que están en el taller
  const porPatente = {};
  for(const [pat, pre] of Object.entries(AUTOS_TALLER)) porPatente[pat] = fotosDe(pre);
  const cargadas = await page.evaluate(porPatente => {
    const ings = lsReadAll('ingresos'), vs = lsReadAll('vehiculos');
    let n = 0;
    for(const i of ings){
      const v = vs.find(x => x.id === i.vehiculoId);
      const f = v && porPatente[v.patente];
      if(f && Object.keys(f).length){ i.fotos = f; n += Object.keys(f).length; }
    }
    lsWriteAll('ingresos', ings);
    return n;
  }, porPatente);
  await page.reload();
  await page.waitForFunction(() => typeof state !== 'undefined' && state.loaded && state.loaded.ingresos && state.ingresos.length > 0);
  await page.waitForTimeout(600);
  return cargadas;
}
