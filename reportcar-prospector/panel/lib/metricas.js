// @ts-check
// Métricas del panel (§6.5). Funciones puras: las usa el panel y las puede usar el resumen semanal (Fase 3).
import { ORDEN_EMBUDO } from './secuencia.js';
import { sumarDias, diaSemana, hoyAR } from './fechas.js';

export const ETAPAS = [
  { id: 'contactado', label: 'Contactados' },
  { id: 'respondio', label: 'Respondieron' },
  { id: 'reunion', label: 'Reunión' },
  { id: 'propuesta', label: 'Propuesta' },
  { id: 'cerrado', label: 'Cerrados' },
];
/** Tasa de respuesta de referencia (§10). */
export const REFERENCIA_RESPUESTA = 0.10;
export const DIAS_CONSTANCIA = 28;

/**
 * Hasta qué etapa llegó un negocio (0 = sin contactar … 5 = cerrado).
 * Los descartados cuentan hasta donde habían llegado (`estadoPrevio`), y como contactados si ya se les escribió.
 * @param {any} n
 */
export function etapaAlcanzada(n) {
  if (n.estado === 'descartado') {
    const previo = ORDEN_EMBUDO[n.estadoPrevio] ?? 0;
    return Math.max(previo, (n.paso || 0) > 0 || n.primerContacto ? 1 : 0);
  }
  const e = ORDEN_EMBUDO[n.estado] ?? 0;
  // Un alta manual que entró directo como "respondió" o "reunión" también cuenta como contactado.
  return e;
}

/** @param {any[]} negocios */
export function embudo(negocios) {
  const conteo = ETAPAS.map((et) => ({ ...et, n: 0 }));
  for (const neg of negocios) {
    const alc = etapaAlcanzada(neg);
    for (let i = 0; i < conteo.length; i++) if (alc >= i + 1) conteo[i].n++;
  }
  const contactados = conteo[0].n;
  return {
    etapas: conteo.map((c) => ({ ...c, pct: contactados ? c.n / contactados : 0 })),
    contactados,
    respondieron: conteo[1].n,
    tasaRespuesta: contactados ? conteo[1].n / contactados : 0,
  };
}

/**
 * Embudo agrupado por un campo (variante, ciudad, canal, fuente…). Solo grupos con al menos un contactado.
 * @param {any[]} negocios @param {(n: any) => string} clave
 */
export function embudoPor(negocios, clave) {
  /** @type {Record<string, any[]>} */
  const grupos = {};
  for (const n of negocios) (grupos[clave(n) || '—'] ||= []).push(n);
  return Object.entries(grupos)
    .map(([k, lista]) => ({ clave: k, ...embudo(lista) }))
    .filter((g) => g.contactados > 0)
    .sort((a, b) => b.contactados - a.contactados || a.clave.localeCompare(b.clave));
}

/** Canal de origen para comparar frío contra cálidos (§10). @param {any} n */
export function canalOrigen(n) {
  if (n.fuente) return n.fuente;
  if (n.origen === 'places') return 'Maps (generador)';
  if (n.origen === 'import_planilla') return 'Planilla';
  return 'Manual';
}

/** @param {any[]} negocios @param {number} [max] */
export function objecionesTop(negocios, max = 8) {
  /** @type {Record<string, { texto: string, n: number }>} */
  const c = {};
  for (const n of negocios) {
    const o = String(n.objecion || '').trim();
    if (!o) continue;
    const k = o.toLowerCase();
    (c[k] ||= { texto: o, n: 0 }).n++;
  }
  return Object.values(c).sort((a, b) => b.n - a.n).slice(0, max);
}

/**
 * Contactos hechos por día (eventos "enviado" y "llamada") en las últimas `dias` jornadas, hoy incluido.
 * @param {{ tipo: string, fecha: Date | null }[]} eventos @param {string} hoy @param {number} [dias]
 */
export function contactosPorDia(eventos, hoy, dias = DIAS_CONSTANCIA) {
  const desde = sumarDias(hoy, -(dias - 1));
  /** @type {Record<string, number>} */
  const c = {};
  for (const e of eventos) {
    if (!e.fecha || (e.tipo !== 'enviado' && e.tipo !== 'llamada')) continue;
    const d = hoyAR(e.fecha);
    if (d >= desde && d <= hoy) c[d] = (c[d] || 0) + 1;
  }
  const serie = [];
  for (let i = 0; i < dias; i++) {
    const dia = sumarDias(desde, i);
    const w = diaSemana(dia);
    serie.push({ dia, n: c[dia] || 0, habil: w !== 0 && w !== 6 });
  }
  const habiles = serie.filter((s) => s.habil && s.dia < hoy); // hoy todavía no terminó
  return {
    serie,
    total: serie.reduce((s, x) => s + x.n, 0),
    diasHabiles: habiles.length,
    diasConContacto: habiles.filter((s) => s.n > 0).length,
  };
}

/** Desde qué momento pedir eventos para `contactosPorDia`. @param {string} hoy @param {number} [dias] */
export function inicioVentana(hoy, dias = DIAS_CONSTANCIA) {
  return new Date(sumarDias(hoy, -(dias - 1)) + 'T00:00:00-03:00');
}

/**
 * Lectura contra la referencia de §10.
 * @param {{ contactados: number, tasaRespuesta: number, etapas: { n: number }[] }} e
 */
export function lecturaReferencia(e) {
  if (e.contactados < 20) return `Todavía hay pocos contactados (${e.contactados}) para sacar conclusiones; la referencia es ≥10% de respuesta.`;
  const pct = Math.round(e.tasaRespuesta * 100);
  if (e.tasaRespuesta >= REFERENCIA_RESPUESTA) {
    return e.etapas[2].n > 0
      ? `Responde el ${pct}% (referencia ≥10%) y hay reuniones: seguí con la variante que mejor anda y sumá ciudades.`
      : `Responde el ${pct}% (referencia ≥10%) pero todavía no hay reuniones: ajustá el contacto 2 y cómo se presenta la oferta.`;
  }
  if (e.tasaRespuesta < 0.05) return `Responde el ${pct}%, por debajo del 5%: cambiá el gancho o el tipo de negocio.`;
  return `Responde el ${pct}%, debajo de la referencia de 10%: probá ajustar el primer mensaje.`;
}
