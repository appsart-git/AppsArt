// @ts-check
// Lógica de la secuencia de contactos (§6.4) y de la pantalla "Hoy" (§6.1).
// Funciones puras: devuelven el "patch" para el negocio y el evento a registrar; la capa de datos los guarda.
import { aHabil, sumarDias, proximoLunes, diasEntre } from './fechas.js';

export const ESTADOS = ['sin_contactar', 'contactado', 'respondio', 'reunion', 'propuesta', 'cerrado', 'descartado'];
export const ESTADO_LABEL = {
  sin_contactar: 'Sin contactar', contactado: 'Contactado', respondio: 'Respondió', reunion: 'Reunión agendada',
  propuesta: 'Propuesta enviada', cerrado: 'Cerrado', descartado: 'Descartado',
};
/** Orden del embudo (descartado queda fuera). */
export const ORDEN_EMBUDO = { sin_contactar: 0, contactado: 1, respondio: 2, reunion: 3, propuesta: 4, cerrado: 5 };
export const TOTAL_CONTACTOS = 4;
export const DIAS_REACTIVAR = 60;

/** Estados que cortan la secuencia. */
const CORTAN = new Set(['respondio', 'reunion', 'propuesta', 'cerrado', 'descartado']);

/** @param {any} n */
export function siguienteContacto(n) {
  return Math.min((n.paso || 0) + 1, TOTAL_CONTACTOS);
}

/** Canal del contacto N: el 3 es siempre llamada; si el negocio no tiene WhatsApp, todos son llamada. @param {any} n @param {number} contacto */
export function canalDelContacto(n, contacto) {
  if (contacto === 3) return 'llamada';
  if (!n.canal || n.canal === 'whatsapp') return 'whatsapp';
  return n.canal;
}

/** @param {number} contactoHecho 1..4 @param {number[]} cadencia @param {string} hoy */
export function proximoToqueTras(contactoHecho, cadencia, hoy) {
  if (contactoHecho >= cadencia.length) return null;
  return aHabil(sumarDias(hoy, cadencia[contactoHecho] - cadencia[contactoHecho - 1]));
}

/**
 * "Enviado" / "Llamé": registra el contacto que tocaba.
 * @param {any} n @param {number[]} cadencia @param {string} hoy @param {string} [texto]
 */
export function marcarContacto(n, cadencia, hoy, texto) {
  const contacto = siguienteContacto(n);
  const canal = canalDelContacto(n, contacto);
  const proximo = proximoToqueTras(contacto, cadencia, hoy);
  /** @type {Record<string, any>} */
  const patch = {
    paso: contacto,
    estado: CORTAN.has(n.estado) ? n.estado : 'contactado',
    proximoToque: proximo,
    secuenciaTerminada: proximo === null,
    ultimoContacto: hoy,
  };
  if (!n.primerContacto) patch.primerContacto = hoy;
  const evento = { tipo: canal === 'llamada' ? 'llamada' : 'enviado', paso: contacto, canal, texto: texto || '' };
  return { patch, evento };
}

/** @param {string} texto @param {string} [objecion] */
export function marcarRespondio(texto, objecion) {
  /** @type {Record<string, any>} */
  const patch = { estado: 'respondio', proximoToque: null };
  if (objecion) patch.objecion = objecion;
  return { patch, evento: { tipo: 'respondio', texto: [texto, objecion && `Objeción: ${objecion}`].filter(Boolean).join('\n') } };
}

/**
 * Guarda `estadoPrevio` para que las métricas cuenten hasta dónde había llegado.
 * @param {string} motivo @param {boolean} noContactar @param {any} [n]
 */
export function marcarDescartado(motivo, noContactar, n) {
  /** @type {Record<string, any>} */
  const patch = { estado: 'descartado', proximoToque: null };
  if (n && n.estado !== 'descartado') patch.estadoPrevio = n.estado;
  if (noContactar) patch.noContactar = true;
  return { patch, evento: { tipo: 'descartado', texto: (noContactar ? '[Pidió no ser contactado] ' : '') + (motivo || '') } };
}

/** @param {'manana' | 'lunes'} cuando @param {string} hoy */
export function posponer(cuando, hoy) {
  const fecha = cuando === 'lunes' ? proximoLunes(hoy) : aHabil(sumarDias(hoy, 1));
  return { patch: { proximoToque: fecha }, evento: { tipo: 'nota', texto: `Pospuesto al ${fecha}` } };
}

/** Sin WhatsApp: pasa a llamada. */
export function sinWhatsApp() {
  return { patch: { canal: 'llamada' }, evento: { tipo: 'nota', texto: 'No tiene WhatsApp: pasa a llamada' } };
}

/**
 * Cambio de estado desde la ficha o el pipeline.
 * @param {any} n @param {string} estado @param {Record<string, any>} [extra] @param {string} [hoy]
 */
export function cambiarEstado(n, estado, extra = {}, hoy) {
  /** @type {Record<string, any>} */
  const patch = { estado, ...extra };
  if (CORTAN.has(estado)) patch.proximoToque = null;
  // Devuelto a "contactado" desde el pipeline con la secuencia a medias: vuelve a aparecer en Hoy.
  if (estado === 'contactado' && CORTAN.has(n.estado) && !n.secuenciaTerminada && hoy) patch.proximoToque = hoy;
  if (estado === 'sin_contactar') patch.proximoToque = null;
  const tipo = ['reunion', 'propuesta', 'cerrado', 'descartado'].includes(estado) ? estado : 'cambio_estado';
  return { patch, evento: { tipo, texto: `${ESTADO_LABEL[n.estado] || n.estado} → ${ESTADO_LABEL[estado] || estado}` } };
}

/** ¿Se puede reactivar una secuencia terminada? @param {any} n @param {string} hoy */
export function puedeReactivar(n, hoy) {
  return !!n.secuenciaTerminada && n.estado === 'contactado' && !!n.ultimoContacto && diasEntre(n.ultimoContacto, hoy) >= DIAS_REACTIVAR;
}

/** Reinicia la secuencia desde el contacto 1. @param {any} n @param {string} hoy */
export function reactivar(n, hoy) {
  return {
    patch: { paso: 0, secuenciaTerminada: false, proximoToque: aHabil(hoy), ciclo: (n.ciclo || 1) + 1 },
    evento: { tipo: 'nota', texto: 'Secuencia reactivada' },
  };
}

const RANGO_PRIORIDAD = { A: 0, B: 1, C: 2 };

/**
 * Arma la lista del día.
 * @param {any[]} negocios @param {{ hoy: string, maxContactosDia: number }} opts
 */
export function armarHoy(negocios, { hoy, maxContactosDia }) {
  const activos = negocios.filter((n) => !n.noContactar && n.estado !== 'descartado');
  const primerosHechosHoy = activos.filter((n) => n.primerContacto === hoy).length;

  const atrasados = [], seguimientos = [];
  for (const n of activos) {
    if (n.estado !== 'contactado' || !n.proximoToque || n.proximoToque > hoy) continue;
    (n.proximoToque < hoy ? atrasados : seguimientos).push(n);
  }
  const porFecha = (a, b) => (a.proximoToque < b.proximoToque ? -1 : a.proximoToque > b.proximoToque ? 1 : 0);
  atrasados.sort(porFecha);

  const cupo = Math.max(0, maxContactosDia - primerosHechosHoy);
  const candidatosNuevos = activos
    .filter((n) => n.estado === 'sin_contactar' && (!n.proximoToque || n.proximoToque <= hoy))
    .sort((a, b) =>
      (RANGO_PRIORIDAD[a.prioridad] ?? 3) - (RANGO_PRIORIDAD[b.prioridad] ?? 3) ||
      (b.cantResenas || 0) - (a.cantResenas || 0) ||
      String(a.nombre).localeCompare(String(b.nombre)));
  const nuevos = candidatosNuevos.slice(0, cupo);

  const items = [
    ...atrasados.map((n) => ({ n, tipo: 'atrasado' })),
    ...seguimientos.map((n) => ({ n, tipo: 'seguimiento' })),
    ...nuevos.map((n) => ({ n, tipo: 'nuevo' })),
  ].map((it) => {
    const contacto = siguienteContacto(it.n);
    return { ...it, contacto, canal: canalDelContacto(it.n, contacto) };
  });

  const seguimientosTodos = items.filter((i) => i.tipo !== 'nuevo');
  return {
    items,
    contador: {
      atrasados: atrasados.length,
      seguimientos: seguimientosTodos.filter((i) => i.canal !== 'llamada').length,
      llamadas: seguimientosTodos.filter((i) => i.canal === 'llamada').length,
      nuevos: nuevos.length,
      primerosHechosHoy,
      sinContactarRestantes: candidatosNuevos.length,
    },
  };
}
