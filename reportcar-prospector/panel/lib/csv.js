// @ts-check
// CSV simple (RFC 4180): comillas, saltos de línea dentro de campos, separador , o ; (autodetectado).

/** @param {string} texto @returns {string[][]} */
export function parseCSV(texto) {
  const s = texto.replace(/^﻿/, '');
  const primera = s.split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  /** @type {string[][]} */
  const filas = [];
  let fila = [], campo = '', enComillas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (enComillas) {
      if (c === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; } else enComillas = false;
      } else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some((f) => f.trim() !== '')) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((f) => f.trim() !== '')) filas.push(fila);
  return filas;
}

/** Filas → objetos con las claves del encabezado. @param {string} texto */
export function csvAObjetos(texto) {
  const [enc = [], ...filas] = parseCSV(texto);
  const claves = enc.map((h) => h.trim());
  return filas.map((f) => Object.fromEntries(claves.map((k, i) => [k, (f[i] ?? '').trim()])));
}

/** @param {string[]} columnas @param {Record<string, unknown>[]} filas */
export function aCSV(columnas, filas) {
  const esc = (/** @type {unknown} */ v) => {
    const t = v == null ? '' : String(v);
    return /[",;\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + [columnas.map(esc).join(','), ...filas.map((f) => columnas.map((c) => esc(f[c])).join(','))].join('\r\n');
}
