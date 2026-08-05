'use strict';
/* ===================== COMPROBANTE DE VENTA (PDF + envío por WhatsApp) ===================== */

/* ===================== ESTADO DE CUENTA (PDF + envío por WhatsApp) ===================== */

function estadoCuentaInnerHtml(cliente){
  // Los pagos se registran contra el saldo total del cliente, no contra una venta puntual (no hay
  // relación pago→venta en el modelo de datos). Por eso NO se puede mostrar un "pendiente" honesto
  // por cada venta — se muestran las ventas a cuenta como referencia y los pagos aparte, y el único
  // número que manda es el saldo actual real (cliente.saldo).
  const ventasCuenta = state.ventas
    .filter(v => !v.anulada && v.clienteId===cliente.id && v.formaPago!=='contado')
    .sort((a,b)=>a.createdAt-b.createdAt);
  const pagos = state.pagos
    .filter(p => p.tipo==='cliente' && p.entidadId===cliente.id && !p.anulada)
    .sort((a,b)=>a.createdAt-b.createdAt);
  const ventasRows = ventasCuenta.map(v => {
    const descPct = v.subtotal>0 ? (Number(v.descuentoTotal)||0)/v.subtotal*100 : 0;
    return `<tr>
      <td>${String(v.numero).padStart(5,'0')}</td>
      <td>${esc(v.fecha)}</td>
      <td class="num">${money(v.subtotal)}</td>
      <td class="num">${descPct?descPct.toFixed(1)+'%':'—'}</td>
      <td class="num">${money(v.total)}</td>
    </tr>`;
  }).join('');
  const pagosRows = pagos.map(p => `
    <tr><td>${new Date(p.createdAt).toLocaleDateString('es-AR')}${p.nota?' — '+esc(p.nota):''}</td><td class="num">${money(p.monto)}</td></tr>`).join('');
  const n = state.negocio;
  return `
    <div class="cp-head">
      <img src="./logo-web.jpg">
      <h2>${esc(n.nombre||'MUNDO REPUESTOS')}</h2>
      <div class="sub">Estado de cuenta</div>
    </div>
    <div class="cp-body">
      <div class="cp-meta">
        <div>Cliente:<br><b>${esc(cliente.nombre)}</b>${cliente.telefono?'<br>'+esc(cliente.telefono):''}</div>
        <div style="text-align:right;">Generado<br>${new Date().toLocaleDateString('es-AR')}</div>
      </div>
      <div class="cp-totals" style="margin-top:0;">
        <div class="r total"><span>Saldo actual</span><span>${money(cliente.saldo)}</span></div>
      </div>
      <h3 style="font-size:12px; margin:16px 0 6px; text-transform:uppercase; color:#888;">Ventas a cuenta corriente</h3>
      <table class="cp-table">
        <thead><tr><th>N°</th><th>Fecha</th><th class="num">Subtotal</th><th class="num">Desc.</th><th class="num">Total</th></tr></thead>
        <tbody>${ventasRows || `<tr><td colspan="5" style="text-align:center;color:#888;padding:10px 0;">Sin ventas a cuenta corriente.</td></tr>`}</tbody>
      </table>
      ${pagosRows ? `<table class="cp-table" style="margin-top:14px;">
        <thead><tr><th>Pagos registrados</th><th class="num">Monto</th></tr></thead>
        <tbody>${pagosRows}</tbody>
      </table>` : ''}
      <p style="text-align:center; font-size:10px; color:#999; margin:16px 0 0;">Documento no válido como factura.</p>
    </div>
    <div class="cp-foot">by <img src="./appsart-brand.png" alt="AppsArt"></div>`;
}

function estadoCuentaFileName(cliente){ return 'estado-cuenta-' + (cliente.nombre||'cliente').toLowerCase().replace(/[^a-z0-9]+/g,'-') + '.pdf'; }

async function buildEstadoCuentaPdfBlob(cliente){
  const tpl = document.getElementById('comprobanteTemplate');
  tpl.innerHTML = estadoCuentaInnerHtml(cliente);
  await waitImagesReady(tpl);
  void tpl.offsetHeight;
  const h = tpl.scrollHeight;
  const canvas = await html2canvas(tpl, {scale:2, backgroundColor:'#ffffff', width:480, height:h, windowWidth:480});
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({unit:'px', format:[480, h], hotfixes:['px_scaling']});
  pdf.addImage(imgData, 'JPEG', 0, 0, 480, h);
  return pdf.output('blob');
}

function mostrarEstadoCuenta(cliente){
  const waDigits = cliente.telefono ? digitsOnly(cliente.telefono) : '';
  openModal(`
    <div class="modal-head"><h2>Estado de cuenta — ${esc(cliente.nombre)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div style="max-height:60vh; overflow:auto; border:1px solid var(--border); border-radius:10px;">
      <div id="ecPreview" style="width:480px; max-width:100%; margin:0 auto; background:#fff; color:#111;">${estadoCuentaInnerHtml(cliente)}</div>
    </div>
    <div class="modal-actions" style="justify-content:flex-start;">
      <button class="btn" data-action="estadoCuentaDescargar" data-cid="${cliente.id}">⬇ Descargar PDF</button>
      <button class="btn btn-primary" data-action="estadoCuentaCompartir" data-cid="${cliente.id}">📲 Enviar por WhatsApp</button>
      ${waDigits ? `<a class="btn" target="_blank" href="https://wa.me/${waDigits}?text=${encodeURIComponent('Hola '+cliente.nombre+', te paso tu estado de cuenta con '+state.negocio.nombre+'. Saldo pendiente: '+money(cliente.saldo))}">Abrir WhatsApp (solo texto)</a>` : ''}
    </div>`, {wide:true});
}

Object.assign(actions, {
  verEstadoCuenta(el){
    const cliente = findCliente(el.dataset.id);
    if(cliente) mostrarEstadoCuenta(cliente);
  },
  estadoCuentaDescargar(el){
    const cliente = findCliente(el.dataset.cid);
    withBusyButton(el, 'Generando…', async () => {
      const blob = await buildEstadoCuentaPdfBlob(cliente);
      downloadBlob(blob, estadoCuentaFileName(cliente));
    });
  },
  estadoCuentaCompartir(el){
    const cliente = findCliente(el.dataset.cid);
    withBusyButton(el, 'Generando…', async () => {
      try{
        const blob = await buildEstadoCuentaPdfBlob(cliente);
        const filename = estadoCuentaFileName(cliente);
        const file = new File([blob], filename, {type:'application/pdf'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title:'Estado de cuenta '+cliente.nombre, text:'Estado de cuenta'});
        } else {
          downloadBlob(blob, filename);
          toast('Tu navegador no permite compartir directo. Se descargó el PDF para que lo adjuntes en WhatsApp.');
        }
      }catch(err){
        if(err && err.name === 'AbortError') return;
        console.error(err);
        toast('No se pudo compartir el PDF.');
      }
    });
  }
});

/* ===================== EXCEL GENÉRICO PARA TABLAS (reportes / historiales) ===================== */
// Reportes y historiales se exportan como .xlsx (dato crudo, editable) en vez de PDF: el objetivo
// es que el usuario pueda filtrar/sumar/armar tablas dinámicas, no solo mirar un documento fijo.
// Los valores numéricos van como número (no como texto formateado "$1.234,56") para que Excel
// pueda sumarlos/promediarlos directamente.
async function descargarTablaExcel(btn, filename, sheetName, headers, rows){
  await withBusyButton(btn, 'Generando…', async () => {
    try{
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0,31));
      XLSX.writeFile(wb, filename);
    }catch(err){
      console.error(err);
      toast('No se pudo generar el Excel.');
    }
  });
}

function comprobanteInnerHtml(venta, cliente){
  const n = state.negocio;
  const items = venta.items.map(it => {
    const sub = (Number(it.cantidad)||0)*(Number(it.precioUnitario)||0)*(1-(Number(it.descuentoPct)||0)/100);
    return `<tr>
      <td>${esc(it.descripcion)}${it.vehiculo?`<div style="font-size:10px;color:#888;">Vehículo: ${esc(it.vehiculo)}</div>`:''}${it.descuentoPct?`<div style="font-size:10px;color:#888;">Desc. ${it.descuentoPct}%</div>`:''}</td>
      <td class="num">${it.cantidad}</td>
      <td class="num">${money(it.precioUnitario)}</td>
      <td class="num">${money(sub)}</td>
    </tr>`;
  }).join('');
  const pagoTxt = venta.formaPago==='contado' ? 'Contado' : venta.formaPago==='cuenta corriente' ? 'Cuenta corriente' : 'Pago parcial';
  return `
    <div class="cp-head">
      <img src="./logo-web.jpg">
      <h2>${esc(n.nombre||'MUNDO REPUESTOS')}</h2>
      <div class="sub">${esc(n.direccion||'')}${n.direccion&&n.telefono?' · ':''}${esc(n.telefono||'')}</div>
    </div>
    <div class="cp-body">
      <div class="cp-meta">
        <div>Comprobante N° ${String(venta.numero).padStart(5,'0')}<br>${new Date(venta.createdAt).toLocaleDateString('es-AR')}</div>
        <div style="text-align:right;">Cliente:<br><b>${esc(venta.clienteNombre||'Consumidor final')}</b></div>
      </div>
      <table class="cp-table">
        <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div class="cp-totals">
        <div class="r"><span>Subtotal</span><span>${money(venta.subtotal)}</span></div>
        <div class="r"><span>Descuentos</span><span>-${money(venta.descuentoTotal)}</span></div>
        <div class="r total"><span>Total</span><span>${money(venta.total)}</span></div>
      </div>
      <div class="cp-pago">
        Forma de pago: <b>${pagoTxt}</b>
        ${venta.saldoPendiente>0
          ? `<br>Abonado: ${money(venta.montoAbonado)} — Saldo pendiente: <b>${money(venta.saldoClienteTotal || venta.saldoPendiente)}</b>`
          : (Number(venta.saldoClienteTotal)>0 ? `<br>Saldo pendiente de cuenta corriente: <b>${money(venta.saldoClienteTotal)}</b>` : '')}
      </div>
      <p style="text-align:center; font-size:10px; color:#999; margin:16px 0 0;">Documento no válido como factura.</p>
    </div>
    <div class="cp-foot">by <img src="./appsart-brand.png" alt="AppsArt"></div>`;
}

function comprobanteFileName(venta){ return 'comprobante-' + String(venta.numero).padStart(5,'0') + '.pdf'; }

async function buildComprobantePdfBlob(venta, cliente){
  const tpl = document.getElementById('comprobanteTemplate');
  tpl.innerHTML = comprobanteInnerHtml(venta, cliente);
  await waitImagesReady(tpl);
  void tpl.offsetHeight;
  const h = tpl.scrollHeight;
  const canvas = await html2canvas(tpl, {scale:2, backgroundColor:'#ffffff', width:480, height:h, windowWidth:480});
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({unit:'px', format:[480, h], hotfixes:['px_scaling']});
  pdf.addImage(imgData, 'JPEG', 0, 0, 480, h);
  return pdf.output('blob');
}

function mostrarComprobante(venta, cliente){
  const waDigits = cliente && cliente.telefono ? digitsOnly(cliente.telefono) : '';
  openModal(`
    <div class="modal-head"><h2>Venta confirmada — Comprobante N° ${String(venta.numero).padStart(5,'0')}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div style="max-height:60vh; overflow:auto; border:1px solid var(--border); border-radius:10px;">
      <div id="cpPreview" style="width:480px; max-width:100%; margin:0 auto; background:#fff; color:#111;">${comprobanteInnerHtml(venta, cliente)}</div>
    </div>
    <p class="muted" style="font-size:12px; margin-top:10px;">"Enviar por WhatsApp" abre el selector para compartir el PDF (en celular). En PC no siempre se puede adjuntar automático: descargá el PDF y adjuntalo a mano, o usá el link de texto.</p>
    <div class="modal-actions" style="justify-content:flex-start;">
      <button class="btn" data-action="comprobanteDescargar" data-vid="${venta.id}">⬇ Descargar PDF</button>
      <button class="btn btn-primary" data-action="comprobanteCompartir" data-vid="${venta.id}">📲 Enviar por WhatsApp</button>
      ${waDigits ? `<a class="btn" target="_blank" href="https://wa.me/${waDigits}?text=${encodeURIComponent('Comprobante N° '+venta.numero+' - '+state.negocio.nombre+' - Total: '+money(venta.total))}">Abrir WhatsApp (solo texto)</a>` : ''}
    </div>`, {wide:true});
  window._ventaComprobanteCache = window._ventaComprobanteCache || {};
  window._ventaComprobanteCache[venta.id] = {venta, cliente};
}

Object.assign(actions, {
  comprobanteDescargar(el){
    const {venta, cliente} = window._ventaComprobanteCache[el.dataset.vid];
    withBusyButton(el, 'Generando…', async () => {
      const blob = await buildComprobantePdfBlob(venta, cliente);
      downloadBlob(blob, comprobanteFileName(venta));
    });
  },
  comprobanteCompartir(el){
    const {venta, cliente} = window._ventaComprobanteCache[el.dataset.vid];
    withBusyButton(el, 'Generando…', async () => {
      try{
        const blob = await buildComprobantePdfBlob(venta, cliente);
        const filename = comprobanteFileName(venta);
        const file = new File([blob], filename, {type:'application/pdf'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title:'Comprobante '+state.negocio.nombre, text:'Comprobante N° '+venta.numero});
        } else {
          downloadBlob(blob, filename);
          toast('Tu navegador no permite compartir directo. Se descargó el PDF para que lo adjuntes en WhatsApp.');
        }
      }catch(err){
        if(err && err.name === 'AbortError') return;
        console.error(err);
        toast('No se pudo compartir el PDF.');
      }
    });
  }
});
