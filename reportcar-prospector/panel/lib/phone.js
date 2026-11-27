// @ts-check
// Normalización de teléfonos argentinos para wa.me.
// En el navegador, "libphonenumber-js/max" se resuelve con el import map de index.html; en Bun, con node_modules.
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

/**
 * @param {string | null | undefined} raw
 * @returns {{ telefonoWa: string | null, esCelularProbable: boolean | null }}
 *   telefonoWa: 549 + área + número para celulares; 54 + área + número para fijos (muchos talleres
 *   tienen WhatsApp Business en el fijo, por eso igual se arma, pero con advertencia).
 */
export function normalizarTelefono(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { telefonoWa: null, esCelularProbable: null };
  const p = parsePhoneNumberFromString(s, 'AR');
  if (!p || p.country !== 'AR' || !p.isValid()) return { telefonoWa: null, esCelularProbable: null };
  const tipo = p.getType();
  const nsn = String(p.nationalNumber); // en celulares ya empieza con 9
  const esCelular = tipo === 'MOBILE' ? true : tipo === 'FIXED_LINE' ? false : null;
  return { telefonoWa: '54' + nsn, esCelularProbable: esCelular };
}

/**
 * Canal inicial: WhatsApp siempre que haya número armable (muchos talleres tienen WhatsApp Business en el fijo;
 * el panel avisa que parece fijo y, si no tiene, "Sin WhatsApp" lo pasa a llamada). Sin número: llamada.
 * @param {{ telefonoWa?: string | null }} tel
 */
export function canalSugerido(tel) {
  return tel.telefonoWa ? 'whatsapp' : 'llamada';
}
