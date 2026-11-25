// @ts-check
// Fechas "de día" como texto YYYY-MM-DD en hora de Argentina (UTC-3, sin horario de verano).
// Se usan para proximoToque y primerContacto: se comparan como texto y no dependen de la zona del equipo.

const TZ = 'America/Argentina/Buenos_Aires';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** @param {Date} [ahora] @returns {string} */
export function hoyAR(ahora = new Date()) {
  return fmt.format(ahora);
}

/** @param {string} dia @param {number} n */
export function sumarDias(dia, n) {
  const d = new Date(dia + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado @param {string} dia */
export function diaSemana(dia) {
  return new Date(dia + 'T12:00:00Z').getUTCDay();
}

/** Si cae sábado o domingo, pasa al lunes. @param {string} dia */
export function aHabil(dia) {
  const w = diaSemana(dia);
  if (w === 6) return sumarDias(dia, 2);
  if (w === 0) return sumarDias(dia, 1);
  return dia;
}

/** El lunes siguiente (nunca el mismo día). @param {string} dia */
export function proximoLunes(dia) {
  const w = diaSemana(dia);
  return sumarDias(dia, ((8 - w) % 7) || 7);
}

/** Días entre dos fechas YYYY-MM-DD (b - a). @param {string} a @param {string} b */
export function diasEntre(a, b) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}

/** Acepta dd/mm/aaaa, dd-mm-aa, aaaa-mm-dd. Devuelve YYYY-MM-DD o null. @param {unknown} v */
export function parseFecha(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** YYYY-MM-DD → dd/mm/aaaa @param {string | null | undefined} dia */
export function fechaCorta(dia) {
  if (!dia) return '';
  const [y, m, d] = dia.split('-');
  return `${d}/${m}/${y}`;
}
