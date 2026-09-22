'use strict';
/* ===================== OCR DE FACTURAS DE COMPRA (Tesseract.js + Google Cloud Vision opcional) =====================
   Motor por defecto: Tesseract.js (gratis, 100% en el navegador, sin configurar nada). Si el negocio carga
   su propia clave de Google Cloud Vision en Configuración, se usa esa en su lugar — lee mucho mejor letra
   impresa (y manuscrita) que Tesseract. Sin clave configurada, la app sigue funcionando igual que antes.
   Nunca hay una clave por defecto acá: cada instalación paga (o no) su propio uso de Vision. */

function getVisionApiKey(){
  try{ return (localStorage.getItem(lsKey('visionApiKey')) || '').trim(); }catch(e){ return ''; }
}

// Vision devuelve las palabras en el orden de lectura que infiere solo, que en una factura con
// columnas (cantidad/código/detalle/precio) puede mezclar filas — reconstruimos los renglones
// agrupando las palabras por coordenada Y (misma fila) y ordenando por X dentro de cada fila, para
// poder reusar el mismo parseInvoiceText() que ya procesa el texto de Tesseract.
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
  const heights = items.map(i => i.height).sort((a,b) => a-b);
  const medianHeight = heights[Math.floor(heights.length/2)] || 20;
  const rowThreshold = medianHeight * 0.6;

  const rows = [];
  items.sort((a,b) => a.yCenter - b.yCenter).forEach(item => {
    let row = rows.find(r => Math.abs(r.yCenter - item.yCenter) < rowThreshold);
    if(!row){ row = {yCenter:item.yCenter, items:[]}; rows.push(row); }
    row.items.push(item);
    row.yCenter = row.items.reduce((s,i) => s+i.yCenter, 0) / row.items.length;
  });
  rows.sort((a,b) => a.yCenter - b.yCenter);
  return rows.map(r => r.items.sort((a,b) => a.xMin - b.xMin).map(i => i.text).join(' ')).join('\n');
}

async function runVisionOcr(imageDataUrl, apiKey){
  const base64 = String(imageDataUrl||'').split(',')[1] || '';
  if(!base64) throw new Error('Imagen inválida.');
  const resp = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + encodeURIComponent(apiKey), {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({requests:[{image:{content:base64}, features:[{type:'DOCUMENT_TEXT_DETECTION'}], imageContext:{languageHints:['es']}}]})
  });
  const json = await resp.json();
  const result = json && json.responses && json.responses[0];
  const apiError = (result && result.error) || json.error;
  if(apiError) throw new Error(apiError.message || 'Error de Google Cloud Vision.');
  const words = (result && result.textAnnotations) ? result.textAnnotations.slice(1) : [];
  return visionWordsToRowText(words);
}

const OCR_STOPWORDS = [
  'subtotal','total','iva','cuit','cuil','cut','fecha','factura','remito','razon social','razón social',
  'domicilio','domicii','condicion','condición','condon','pagina','página','cae','vencimiento','moneda',
  'cliente','vendedor','cod.iva','cod iva','codigo','código','cant.','detalle','p.lista','p lista','dto',
  'neto','iibb','ing.brutos','ingresos brutos','responsable inscripto','cuenta','o.c.',
  'pedido','cargo ped','prepar','factur','desp:','plazo','devolucion','devolución','mercader','viaja',
  'pagos deben','cheque','orden de','importe de esta factura','dolar','billete','recib','comprometemos',
  'aclarar','firma','autorizada','defensa del consumidor','impresion','impresión','original','provincia',
  'establecimiento','inicio de activ'
];

// Normaliza (minúsculas + sin acentos) para que el filtro de ruido no dependa de tildes exactas.
function ocrNormalize(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

// Muchas facturas ponen el código de producto como primer token de la línea (ej. "96NH", "AP6007").
function extractLeadingCode(line){
  const m = line.match(/^\s*([A-Za-z]{0,4}\d{1,7}[A-Za-z0-9]{0,4})\s+(\S.*)$/);
  if(m && /\d/.test(m[1]) && m[1].length>=2 && m[1].length<=10){
    return { codigo: m[1], resto: m[2] };
  }
  return { codigo:'', resto: line };
}

function parseInvoiceText(text){
  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>=4);
  const rows = [];
  for(const line of lines){
    if(OCR_STOPWORDS.some(w => ocrNormalize(line).includes(ocrNormalize(w)))) continue;
    // Descartar porcentajes (ej. "- 21,00%" de IVA) antes de buscar cantidad/precio: no son ninguno de los dos.
    const lineSinPorcentajes = line.replace(/-?\s*\d+[.,]?\d*\s*%/g, ' ');
    const { codigo, resto } = extractLeadingCode(lineSinPorcentajes);

    // Si hay una cantidad aislada justo al principio (antes de la descripción, después del código),
    // separarla ahora: evita que números sueltos dentro de la descripción (ej. "Citroen C3") se
    // confundan más adelante con la cantidad real.
    let cantidad = 1, restoSinCantidad = resto;
    const qtyMatch = resto.match(/^\s*(\d{1,2}(?:[.,]\d{1,2})?)\s+(?=[^\d\s])(\S.*)$/);
    if(qtyMatch){
      const qn = Number(qtyMatch[1].replace(',','.'));
      if(Number.isFinite(qn) && qn > 0 && qn < 100){
        cantidad = Math.round(qn);
        restoSinCantidad = qtyMatch[2];
      }
    }

    // (?<![A-Za-zÀ-ÿ]) evita agarrar números pegados a una letra (ej. "C3", motorización) como si
    // fueran cantidad/precio.
    const numberRe = /(?<![A-Za-zÀ-ÿ])(?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g;
    const nums = restoSinCantidad.match(numberRe) || [];
    if(!nums.length) continue;
    const parsedNums = nums.map(n => {
      const clean = n.includes(',') ? n.replace(/\./g,'').replace(',','.') : n;
      return Number(clean);
    }).filter(n => !isNaN(n));
    if(!parsedNums.length) continue;

    let costoUnitario;
    if(cantidad > 1 && restoSinCantidad !== resto){
      // La cantidad ya se aisló al inicio: el último número de lo que queda es el precio/total de la columna.
      costoUnitario = parsedNums[parsedNums.length-1];
      if(parsedNums.length >= 3){
        costoUnitario = Math.round((costoUnitario / cantidad) * 100) / 100;
      }
    } else if(parsedNums.length >= 2){
      // No se pudo aislar una cantidad al inicio: heurística de respaldo (primer/último número).
      const first = parsedNums[0], last = parsedNums[parsedNums.length-1];
      cantidad = (first > 0 && first < 100 && Number.isInteger(first)) ? first : 1;
      costoUnitario = last;
      if(parsedNums.length >= 4 && cantidad > 1){
        costoUnitario = Math.round((last / cantidad) * 100) / 100;
      }
    } else {
      costoUnitario = parsedNums[0];
    }

    let descripcion = restoSinCantidad;
    nums.forEach(n => { descripcion = descripcion.replace(n, ''); });
    descripcion = descripcion.replace(/[.\-–x×$*%|]+/g,' ').replace(/\s{2,}/g,' ').trim();
    const letterCount = (descripcion.match(/[a-zA-Zà-úÀ-Ú]/g) || []).length;
    if(letterCount < 5) continue; // sin suficiente texto real: casi seguro es ruido (total suelto, código, etc.)
    if(costoUnitario <= 0 && cantidad === 1) continue; // pure noise line
    rows.push({descripcion, codigoProveedor:codigo, cantidad, costoUnitario});
  }
  return rows.slice(0, 40);
}

function renderOcrTab(){
  const o = state.ocr;
  document.getElementById('comprasTabBody').innerHTML = `
    <div class="card" style="max-width:720px;">
      <p class="muted" style="font-size:13px; margin-top:0;">Sacá una foto o subí una imagen de la factura del proveedor. El sistema intenta leer cantidad, descripción y precio automáticamente — <b>siempre revisá y corregí</b> antes de confirmar, la lectura no es 100% exacta.</p>
      <div class="ocr-drop">
        <input type="file" id="ocr_file" accept="image/*" capture="environment" style="display:none;">
        <button class="btn" data-action="ocrElegirImagen">📷 Elegir / sacar foto de la factura</button>
      </div>
      ${o.imageDataUrl ? `<img src="${o.imageDataUrl}" class="ocr-preview">` : ''}
      ${o.imageDataUrl && !o.rows.length ? `<button class="btn btn-primary" style="width:100%;" data-action="ocrProcesar" ${o.processing?'disabled':''}>${o.processing?'Leyendo factura…':'Leer factura'}</button>` : ''}
      ${o.processing ? `<div class="progress-bar"><div class="fill" style="width:${o.progress}%"></div></div>` : ''}
      ${o.rows.length ? renderOcrRowsTable() : ''}
    </div>`;
  const fileInput = document.getElementById('ocr_file');
  if(fileInput){
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => { state.ocr.imageDataUrl = reader.result; state.ocr.rows = []; state.ocr.text=''; renderCompras(); };
      reader.readAsDataURL(file);
    });
  }
}

function renderOcrRowsTable(){
  const rows = state.ocr.rows;
  return `
    <h3 style="font-size:14px; margin-top:16px;">Líneas detectadas — revisá y corregí</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Descripción</th><th>Código prov.</th><th>Cant.</th><th>Costo unit.</th><th></th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`
            <tr>
              <td><input value="${esc(r.descripcion)}" data-change="ocrDesc" data-i="${i}"></td>
              <td><input value="${esc(r.codigoProveedor)}" style="width:110px;" data-change="ocrCodigo" data-i="${i}"></td>
              <td><input type="number" min="1" step="1" class="cart-line-input" value="${r.cantidad}" data-change="ocrCant" data-i="${i}"></td>
              <td><input type="number" min="0" step="0.01" class="cart-line-input" value="${r.costoUnitario}" data-change="ocrCosto" data-i="${i}"></td>
              <td><button class="btn btn-sm btn-icon btn-danger" data-action="ocrQuitarFila" data-i="${i}">✕</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
      <button class="btn btn-sm" data-action="ocrAgregarFilaVacia">+ Agregar línea manual</button>
      <button class="btn btn-primary" data-action="ocrConfirmarTodo">Agregar todo a la compra →</button>
      <button class="btn btn-sm btn-ghost" data-action="ocrReiniciar">Descartar y volver a escanear</button>
    </div>`;
}

Object.assign(actions, {
  ocrElegirImagen(){ document.getElementById('ocr_file').click(); },
  ocrProcesar(el){
    state.ocr.processing = true; state.ocr.progress = 0; renderCompras();
    (async () => {
      const apiKey = getVisionApiKey();
      try{
        let text;
        if(apiKey){
          text = await runVisionOcr(state.ocr.imageDataUrl, apiKey);
        } else {
          const worker = await Tesseract.createWorker('spa', 1, {
            logger: m => { if(m.status==='recognizing text'){ state.ocr.progress = Math.round((m.progress||0)*100); const bar=document.querySelector('.progress-bar .fill'); if(bar) bar.style.width = state.ocr.progress+'%'; } }
          });
          // PSM 4 = "columna de texto de tamaño variable": lee mucho mejor facturas con columnas (cantidad/código/detalle/precio) que el modo automático
          await worker.setParameters({tessedit_pageseg_mode:'4'});
          const res = await worker.recognize(state.ocr.imageDataUrl);
          await worker.terminate();
          text = res.data.text;
        }
        state.ocr.processing = false; state.ocr.text = text;
        state.ocr.rows = parseInvoiceText(text);
        if(!state.ocr.rows.length) toast('No se pudo leer texto útil de la imagen. Probá con más luz/foco o cargá las líneas manualmente.');
        renderCompras();
      }catch(err){
        console.error(err); state.ocr.processing = false;
        toast(apiKey ? ('Error de Google Cloud Vision: ' + err.message) : 'No se pudo procesar la imagen.');
        renderCompras();
      }
    })();
  },
  ocrQuitarFila(el){ state.ocr.rows.splice(Number(el.dataset.i),1); renderCompras(); },
  ocrAgregarFilaVacia(){ state.ocr.rows.push({descripcion:'', codigoProveedor:'', cantidad:1, costoUnitario:0}); renderCompras(); },
  ocrReiniciar(){ state.ocr = {imageDataUrl:null, processing:false, progress:0, text:'', rows:[]}; renderCompras(); },
  ocrConfirmarTodo(){
    const rows = state.ocr.rows.filter(r => r.descripcion.trim());
    if(!rows.length){ toast('No hay líneas para agregar.'); return; }
    rows.forEach(r => {
      const match = state.productos.find(p => p.activo!==false && (
        (r.codigoProveedor && p.codigoProveedor && p.codigoProveedor.toLowerCase()===r.codigoProveedor.toLowerCase()) ||
        (p.descripcion.toLowerCase() === r.descripcion.toLowerCase())
      ));
      if(match){
        state.compraCart.push({productoId:match.id, codigoProveedor:match.codigoProveedor, descripcion:match.descripcion, cantidad:Number(r.cantidad)||1, costoUnitario:Number(r.costoUnitario)||0, esNuevo:false, origenOCR:true, vehiculo:''});
      } else {
        state.compraCart.push({productoId:null, esNuevo:true, origenOCR:true, codigoProveedor:r.codigoProveedor, descripcion:r.descripcion, rubro:'Otro', cantidad:Number(r.cantidad)||1, costoUnitario:Number(r.costoUnitario)||0, vehiculo:''});
      }
    });
    state.compraOrigenOCR = true;
    state.ocr = {imageDataUrl:null, processing:false, progress:0, text:'', rows:[]};
    state.comprasTab = 'manual';
    toast('Líneas agregadas. Revisá el carrito y elegí el proveedor para confirmar.');
    render();
  }
});

inputActions.ocrDesc = (el) => { state.ocr.rows[Number(el.dataset.i)].descripcion = el.value; };
inputActions.ocrCodigo = (el) => { state.ocr.rows[Number(el.dataset.i)].codigoProveedor = el.value; };
inputActions.ocrCant = (el) => { state.ocr.rows[Number(el.dataset.i)].cantidad = Math.max(1, Number(el.value)||1); };
inputActions.ocrCosto = (el) => { state.ocr.rows[Number(el.dataset.i)].costoUnitario = Math.max(0, Number(el.value)||0); };
