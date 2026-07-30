'use strict';
/* ===================== COMPROBANTE DE VENTA (PDF + envío por WhatsApp) ===================== */

function comprobanteInnerHtml(venta, cliente){
  const n = state.negocio;
  const items = venta.items.map(it => {
    const sub = (Number(it.cantidad)||0)*(Number(it.precioUnitario)||0)*(1-(Number(it.descuentoPct)||0)/100);
    return `<tr>
      <td>${esc(it.descripcion)}${it.descuentoPct?`<div style="font-size:10px;color:#888;">Desc. ${it.descuentoPct}%</div>`:''}</td>
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
        ${venta.saldoPendiente>0 ? `<br>Abonado: ${money(venta.montoAbonado)} — Saldo pendiente: <b>${money(venta.saldoPendiente)}</b>` : ''}
      </div>
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
      <div id="cpPreview" style="width:480px; max-width:100%; margin:0 auto; background:#fff;">${comprobanteInnerHtml(venta, cliente)}</div>
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
