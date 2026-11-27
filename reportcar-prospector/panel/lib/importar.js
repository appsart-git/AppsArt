// @ts-check
// Importación de la planilla de talleres (§5.2) y export a CSV (§5.4).
import { normalizarTelefono, canalSugerido } from './phone.js';
import { parseFecha, hoyAR, aHabil, sumarDias } from './fechas.js';
import { ESTADO_LABEL } from './secuencia.js';

/** Sin acentos, minúsculas, solo letras/números. @param {string} s */
export function normalizarTexto(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** @param {string} s */
export function slugify(s) {
  return normalizarTexto(s).replace(/ /g, '-').slice(0, 80);
}

/** Clave para cruzar duplicados por nombre + ciudad. @param {string} nombre @param {string} ciudad */
export function claveNombreCiudad(nombre, ciudad) {
  return normalizarTexto(nombre) + '|' + normalizarTexto(ciudad);
}

const MAPA_ESTADO = {
  'sin contactar': 'sin_contactar', contactado: 'contactado', respondio: 'respondio', 'reunion agendada': 'reunion',
  reunion: 'reunion', 'propuesta enviada': 'propuesta', propuesta: 'propuesta', cerrado: 'cerrado', descartado: 'descartado',
};
const PASO_POR_ESTADO = { sin_contactar: 0, contactado: 1, respondio: 1, reunion: 1, propuesta: 1, cerrado: 1, descartado: 0 };
const MAPA_CANAL = { whatsapp: 'whatsapp', llamada: 'llamada', instagram: 'instagram', visita: 'visita' };

/** Columnas de la planilla original (orden del export). */
export const COLUMNAS_PLANILLA = ['Taller', 'Ciudad', 'Prioridad', 'Reseñas', 'Teléfono', 'Estado', 'Gancho para el mensaje', 'Provincia', 'Rating', '1er contacto', 'Próximo toque', 'Notas', 'Variante', 'Canal', 'Objeción'];

/** Busca una columna aunque cambien mayúsculas/acentos. @param {Record<string,string>} fila @param {string} nombre */
function col(fila, nombre) {
  const buscada = normalizarTexto(nombre);
  for (const k of Object.keys(fila)) if (normalizarTexto(k) === buscada) return fila[k];
  return '';
}

/** @param {string} v */
function numero(v) {
  const t = String(v ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}
/** @param {string} v */
function rating(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Convierte una fila de la planilla en un Negocio (sin timestamps de creación: los pone la capa de datos).
 * @param {Record<string,string>} fila
 * @param {{ rubro: string, cadenciaDias: number[], varianteSiVacia: () => 'A' | 'B', hoy?: string }} ctx
 * @returns {{ negocio: Record<string, any> | null, avisos: string[] }}
 */
export function filaANegocio(fila, ctx) {
  const avisos = [];
  const nombre = col(fila, 'Taller');
  const ciudad = col(fila, 'Ciudad');
  if (!nombre) return { negocio: null, avisos: ['Fila sin nombre de taller: se saltea'] };
  const hoy = ctx.hoy || hoyAR();

  const estadoTxt = normalizarTexto(col(fila, 'Estado'));
  const estado = MAPA_ESTADO[estadoTxt] || 'sin_contactar';
  if (estadoTxt && !MAPA_ESTADO[estadoTxt]) avisos.push(`${nombre}: estado "${col(fila, 'Estado')}" desconocido, queda Sin contactar`);

  const varTxt = col(fila, 'Variante').trim().toUpperCase();
  const variante = varTxt.startsWith('A') ? 'A' : varTxt.startsWith('B') ? 'B' : ctx.varianteSiVacia();

  const telefono = col(fila, 'Teléfono');
  const { telefonoWa, esCelularProbable } = normalizarTelefono(telefono);
  if (telefono && !telefonoWa) avisos.push(`${nombre}: no se pudo interpretar el teléfono "${telefono}"`);

  const canalTxt = normalizarTexto(col(fila, 'Canal'));
  const canal = MAPA_CANAL[canalTxt] || canalSugerido({ telefonoWa });

  const prioTxt = col(fila, 'Prioridad').trim().toUpperCase();
  const prioridad = ['A', 'B', 'C'].includes(prioTxt[0]) ? prioTxt[0] : 'B';

  const primerContacto = parseFecha(col(fila, '1er contacto'));
  let proximoToque = parseFecha(col(fila, 'Próximo toque'));
  const paso = PASO_POR_ESTADO[estado];
  if (estado === 'contactado' && !proximoToque) {
    proximoToque = primerContacto ? aHabil(sumarDias(primerContacto, ctx.cadenciaDias[1] - ctx.cadenciaDias[0])) : aHabil(hoy);
  }
  if (estado !== 'contactado' && estado !== 'sin_contactar') proximoToque = null;

  const negocio = {
    id: 'manual_' + slugify(`${nombre} ${ciudad}`),
    rubro: ctx.rubro,
    slug: slugify(nombre),
    nombre, ciudad, provincia: col(fila, 'Provincia'),
    telefono: telefono || null, telefonoWa, esCelularProbable,
    rating: rating(col(fila, 'Rating')) ?? null,
    cantResenas: numero(col(fila, 'Reseñas')) ?? null,
    prioridad,
    gancho: col(fila, 'Gancho para el mensaje') || '',
    ganchoCorto: '',
    estado, paso,
    proximoToque: proximoToque || null,
    primerContacto: primerContacto || null,
    ultimoContacto: primerContacto || null,
    variante, canal,
    objecion: col(fila, 'Objeción') || '',
    notas: col(fila, 'Notas') || '',
    noContactar: false,
    origen: 'import_planilla',
  };
  return { negocio, avisos };
}

/**
 * Prepara la importación: decide qué filas son nuevas. Nunca toca negocios que ya existen.
 * @param {Record<string,string>[]} filas @param {any[]} existentes @param {{ rubro: string, cadenciaDias: number[] }} rubro
 */
export function planificarImportacion(filas, existentes, rubro) {
  const ids = new Set(existentes.map((n) => n.id));
  const claves = new Set(existentes.map((n) => claveNombreCiudad(n.nombre, n.ciudad)));
  const cuenta = { A: 0, B: 0 };
  for (const n of existentes) if (n.variante === 'A' || n.variante === 'B') cuenta[n.variante]++;
  const varianteSiVacia = () => {
    const v = cuenta.A <= cuenta.B ? 'A' : 'B';
    cuenta[v]++;
    return /** @type {'A'|'B'} */ (v);
  };
  const nuevos = [], repetidos = [], avisos = [];
  for (const fila of filas) {
    // Primero se mira si ya existe, para no gastar una variante en una fila repetida.
    const nombre = col(fila, 'Taller'), ciudad = col(fila, 'Ciudad');
    if (nombre && claves.has(claveNombreCiudad(nombre, ciudad))) { repetidos.push(nombre); continue; }
    const varTxt = col(fila, 'Variante').trim().toUpperCase();
    if (varTxt.startsWith('A')) cuenta.A++; else if (varTxt.startsWith('B')) cuenta.B++;
    const r = filaANegocio(fila, { rubro: rubro.id ?? rubro.rubro, cadenciaDias: rubro.cadenciaDias, varianteSiVacia });
    avisos.push(...r.avisos);
    if (!r.negocio) continue;
    if (ids.has(r.negocio.id)) { repetidos.push(r.negocio.nombre); continue; }
    ids.add(r.negocio.id);
    claves.add(claveNombreCiudad(r.negocio.nombre, r.negocio.ciudad));
    nuevos.push(r.negocio);
  }
  return { nuevos, repetidos, avisos };
}

const VARIANTE_LABEL = { A: 'A · Recompra', B: 'B · Sin abono' };
const CANAL_LABEL = { whatsapp: 'WhatsApp', llamada: 'Llamada', instagram: 'Instagram', visita: 'Visita' };
const fechaPlanilla = (/** @type {string | null | undefined} */ d) => (d ? d.split('-').reverse().join('/') : '');

/** @param {any[]} negocios */
export function negociosAFilasPlanilla(negocios) {
  return negocios.map((n) => ({
    id: n.id,
    Taller: n.nombre, Ciudad: n.ciudad, Prioridad: n.prioridad, 'Reseñas': n.cantResenas ?? '', 'Teléfono': n.telefono ?? '',
    Estado: ESTADO_LABEL[n.estado] || n.estado, 'Gancho para el mensaje': n.gancho ?? '', Provincia: n.provincia ?? '',
    Rating: n.rating ?? '', '1er contacto': fechaPlanilla(n.primerContacto), 'Próximo toque': fechaPlanilla(n.proximoToque),
    Notas: n.notas ?? '', Variante: VARIANTE_LABEL[n.variante] || '', Canal: CANAL_LABEL[n.canal] || '', 'Objeción': n.objecion ?? '',
    'Gancho corto': n.ganchoCorto ?? '', Origen: n.origen ?? '', 'No contactar': n.noContactar ? 'sí' : '',
  }));
}
export const COLUMNAS_EXPORT = ['id', ...COLUMNAS_PLANILLA, 'Gancho corto', 'Origen', 'No contactar'];
