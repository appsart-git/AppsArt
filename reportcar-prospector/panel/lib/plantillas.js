// @ts-check
// Plantillas con variables {taller}, {ganchoCorto}, {video}, {firma}.
// Bloques opcionales: [[texto con {var}|alternativa]] → si alguna variable del bloque está vacía,
// se usa la alternativa (o nada si no hay "|").

/** @param {string} tpl @param {Record<string, string | undefined | null>} vars */
export function renderPlantilla(tpl, vars) {
  const val = (/** @type {string} */ k) => String(vars[k] ?? '').trim();
  const conBloques = tpl.replace(/\[\[([\s\S]*?)\]\]/g, (_, cuerpo) => {
    const [si, no = ''] = String(cuerpo).split('|');
    const usadas = [...si.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    return usadas.every((k) => val(k)) ? si : no;
  });
  return conBloques.replace(/\{(\w+)\}/g, (_, k) => val(k)).replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * Mensaje para el contacto N de un negocio. Usa el mensaje de Claude (Fase 5) si existe.
 * @param {any} negocio @param {number} contacto 1..4 @param {any} rubro @param {Record<string, any>} [mensajesGenerados]
 * @returns {{ texto: string, fuente: 'claude' | 'plantilla' | 'guion' }}
 */
export function mensajeParaContacto(negocio, contacto, rubro, mensajesGenerados = {}) {
  const variante = negocio.variante || 'A';
  const vars = {
    taller: negocio.nombre,
    ganchoCorto: negocio.ganchoCorto,
    video: rubro.videoUrl?.[variante],
    firma: rubro.firma,
    // En la llamada, "te escribí por WhatsApp" solo si ya hubo un mensaje antes.
    previo: (negocio.paso || 0) >= 1 && negocio.canal !== 'llamada' ? rubro.textoPrevioLlamada : '',
  };
  if (contacto === 3) {
    const lineas = (rubro.plantillas?.llamada || []).map((l, i) => `${i + 1}. ${renderPlantilla(l, vars)}`);
    return { texto: lineas.join('\n'), fuente: 'guion' };
  }
  const gen = mensajesGenerados[String(contacto)];
  if (gen?.texto) return { texto: gen.texto, fuente: 'claude' };
  const tpl = rubro.plantillas?.[variante]?.[String(contacto)] || '';
  return { texto: renderPlantilla(tpl, vars), fuente: 'plantilla' };
}

/** @param {string} telefonoWa @param {string} texto */
export function linkWhatsApp(telefonoWa, texto) {
  return `https://wa.me/${telefonoWa}?text=${encodeURIComponent(texto)}`;
}
