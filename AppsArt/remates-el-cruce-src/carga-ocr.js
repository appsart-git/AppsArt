'use strict';
/* ===================== OCR DE PAGINAS DE CUADERNO (Tesseract.js, 100% en el navegador) =====================
   El cuaderno tiene 3 columnas por renglón: código (4-6 dígitos) · descripción · precio ($ con puntos de miles).
   A diferencia de una factura impresa, esto es manuscrito — la lectura va a fallar bastante más seguido.
   Este parser es un punto de partida para ahorrar tipeo, no una lectura confiable: siempre se revisa a mano
   con la imagen original visible al lado (ver renderOcrTab en carga.html). */

// Igual que en el parser de facturas de Mundo Repuestos: soporta miles con "." o "," y decimales opcionales.
const CUADERNO_NUMBER_RE = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;

function parseCuadernoLine(rawLine){
  const line = String(rawLine || '').trim();
  if(line.length < 4) return null;

  // El OCR a veces mete un espacio de mas en medio del codigo (ej "134 01" en vez de "13401") cuando el
  // renglon del cuaderno tiene poco espaciado entre digitos. Lo toleramos solo si el codigo resultante
  // (sin el espacio) tiene 4-6 digitos y lo que sigue es texto (la descripcion) — si en cambio lo que
  // sigue es otro numero, es un dato aparte pegado al codigo, no el mismo codigo partido.
  const splitMatch = line.match(/^\s*(\d{2,3})\s(\d{2,3})(?=\s+[A-Za-zÁÉÍÓÚÑáéíóúñ])/);
  const splitCodigo = splitMatch ? splitMatch[1] + splitMatch[2] : null;
  let codigo, restoStart;
  if(splitCodigo && splitCodigo.length >= 4 && splitCodigo.length <= 6){
    codigo = splitCodigo;
    restoStart = splitMatch.index + splitMatch[0].length;
  } else {
    const codeMatch = line.match(/(\d{4,6})/);
    if(!codeMatch) return null;
    codigo = codeMatch[1];
    restoStart = codeMatch.index + codigo.length;
  }
  const resto = line.slice(restoStart);
  if(!resto.trim()) return null;

  const moneda = /U\$S|USD|U\/S/i.test(resto) ? 'USD' : 'ARS';
  const porUnidad = /c\s*\/\s*u/i.test(resto);

  const nums = resto.match(CUADERNO_NUMBER_RE) || [];
  if(!nums.length) return null;
  const montoStr = nums[nums.length - 1];
  const precio = Number(montoStr.replace(/\./g, '').replace(',', '.'));
  if(!Number.isFinite(precio) || precio <= 0) return null;

  const lastNumIdx = resto.lastIndexOf(montoStr);
  let nombre = resto.slice(0, lastNumIdx);
  nombre = nombre.replace(/U\$S|USD|U\/S/ig, ' ');
  nombre = nombre.replace(/c\s*\/\s*u/ig, ' ');
  nombre = nombre.replace(/[$•·°\-–—]/g, ' ');
  nombre = nombre.replace(/\s{2,}/g, ' ').trim();
  if(nombre.length < 2) return null;

  return { codigo, nombre, categoria: '', precio, moneda, porUnidad, etiquetas: [] };
}

function parseCuadernoText(text){
  return String(text || '')
    .split('\n')
    .map(parseCuadernoLine)
    .filter(Boolean)
    .slice(0, 60);
}

// worker de Tesseract reutilizable por ambas pantallas de carga (escaneo de página)
async function runOcrOnImage(imageDataUrl, onProgress){
  const worker = await Tesseract.createWorker('spa', 1, {
    logger: (m) => {
      if(m.status === 'recognizing text' && typeof onProgress === 'function'){
        onProgress(Math.round((m.progress || 0) * 100));
      }
    }
  });
  // PSM 4 = "columna de texto de tamaño variable": mejor lectura de renglones en columnas que el modo automático.
  await worker.setParameters({ tessedit_pageseg_mode: '4' });
  const { data: { text } } = await worker.recognize(imageDataUrl);
  await worker.terminate();
  return text;
}

/* ===================== OCR con Google Cloud Vision (mucho mejor con manuscrito que Tesseract) =====================
   Probado contra fotos reales del cuaderno: Tesseract.js no reconoció NINGÚN código correctamente (ni con
   preprocesado de imagen), Vision (DOCUMENT_TEXT_DETECTION) sí lee manuscrito de forma utilizable.
   Vision devuelve las palabras en el orden de lectura que infiere solo, que para una tabla de 3 columnas
   (código / descripción / precio) puede mezclar filas — por eso reconstruimos los renglones nosotros mismos
   agrupando las palabras por coordenada Y (misma fila) y ordenando por X dentro de cada fila. */
async function runVisionOcr(imageDataUrl, apiKey){
  const base64 = String(imageDataUrl || '').split(',')[1] || '';
  if(!base64) throw new Error('Imagen inválida.');
  const resp = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['es'] }
      }]
    })
  });
  const json = await resp.json();
  const result = json && json.responses && json.responses[0];
  const apiError = (result && result.error) || json.error;
  if(apiError) throw new Error(apiError.message || 'Error de Google Cloud Vision.');
  const words = (result && result.textAnnotations) ? result.textAnnotations.slice(1) : [];
  return visionWordsToRowText(words);
}

function visionWordsToRowText(words){
  if(!words.length) return '';
  const items = words.map(w => {
    const verts = (w.boundingPoly && w.boundingPoly.vertices) || [];
    const xs = verts.map(v => v.x || 0);
    const ys = verts.map(v => v.y || 0);
    return {
      text: w.description || '',
      xMin: Math.min(...xs),
      yCenter: (Math.min(...ys) + Math.max(...ys)) / 2,
      height: Math.max(...ys) - Math.min(...ys)
    };
  });
  const heights = items.map(i => i.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 20;
  const rowThreshold = medianHeight * 0.6;

  const rows = [];
  items.sort((a, b) => a.yCenter - b.yCenter).forEach(item => {
    let row = rows.find(r => Math.abs(r.yCenter - item.yCenter) < rowThreshold);
    if(!row){ row = { yCenter: item.yCenter, items: [] }; rows.push(row); }
    row.items.push(item);
    row.yCenter = row.items.reduce((s, i) => s + i.yCenter, 0) / row.items.length;
  });
  rows.sort((a, b) => a.yCenter - b.yCenter);
  return rows.map(r => r.items.sort((a, b) => a.xMin - b.xMin).map(i => i.text).join(' ')).join('\n');
}
