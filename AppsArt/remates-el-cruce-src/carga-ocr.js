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

  const codeMatch = line.match(/(\d{4,6})/);
  if(!codeMatch) return null;
  const codigo = codeMatch[1];
  const resto = line.slice(codeMatch.index + codigo.length);
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
