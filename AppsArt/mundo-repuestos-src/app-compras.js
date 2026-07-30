'use strict';
/* ===================== COMPRAS (manual + revisión de OCR comparten el mismo carrito) ===================== */

function compraLineTotal(l){ return (Number(l.cantidad)||0) * (Number(l.costoUnitario)||0); }
function compraCartTotal(){ return state.compraCart.reduce((s,l)=> s + compraLineTotal(l), 0); }

function renderCompras(){
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Compras</h1></div>
    <div class="tabs">
      <div class="tab ${state.comprasTab!=='ocr'&&state.comprasTab!=='historial'?'active':''}" data-action="comprasTab" data-tab="manual">Carga manual</div>
      <div class="tab ${state.comprasTab==='ocr'?'active':''}" data-action="comprasTab" data-tab="ocr">Escanear factura</div>
      <div class="tab ${state.comprasTab==='historial'?'active':''}" data-action="comprasTab" data-tab="historial">Historial</div>
    </div>
    <div id="comprasTabBody"></div>`;
  if(state.comprasTab === 'ocr') renderOcrTab();
  else if(state.comprasTab === 'historial') renderComprasHistorial();
  else renderCompraManual();
}

function renderCompraManual(){
  const proveedor = state.compraProveedor ? findProveedor(state.compraProveedor) : null;
  document.getElementById('comprasTabBody').innerHTML = `
    <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:18px; align-items:start;" class="compras-grid">
      <div class="card">
        <label>Agregar producto existente</label>
        ${productoPickerHtml('cp_search','cp_results')}
        <button class="btn btn-sm" style="margin-top:10px;" data-action="compraNuevoRenglon">+ Cargar producto nuevo (no está en el catálogo)</button>
        <div class="table-wrap" style="margin-top:14px;">
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Costo unit.</th><th>Subtotal</th><th></th></tr></thead>
            <tbody>
              ${state.compraCart.length ? state.compraCart.map((l,i)=>`
                <tr>
                  <td>${esc(l.descripcion)} ${l.esNuevo?'<span class="pill pill-info">Nuevo</span>':''}${l.origenOCR?'<span class="pill pill-warn">OCR</span>':''}<div class="muted" style="font-size:11px;">${esc(l.codigoProveedor||'')}</div></td>
                  <td><input class="cart-line-input" type="number" min="1" step="1" value="${l.cantidad}" data-change="compraCantidad" data-i="${i}"></td>
                  <td><input class="cart-line-input" type="number" min="0" step="0.01" value="${l.costoUnitario}" data-change="compraCosto" data-i="${i}"></td>
                  <td>${money(compraLineTotal(l))}</td>
                  <td><button class="btn btn-sm btn-icon btn-danger" data-action="compraQuitarLinea" data-i="${i}">✕</button></td>
                </tr>`).join('') : `<tr><td colspan="5" class="empty">Sin líneas cargadas todavía.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="field">
          <label>Proveedor</label>
          ${proveedor ? `<div class="row2" style="align-items:center;"><b>${esc(proveedor.nombre)}</b><button class="btn btn-sm" data-action="compraQuitarProveedor">Quitar</button></div>`
            : `<input id="cp_provSearch" placeholder="Buscar proveedor…" autocomplete="off"><div class="cart-search-results" id="cp_provResults" style="display:none;"></div>`}
        </div>
        <div class="field"><label>N° de factura del proveedor (opcional)</label><input id="cp_nroFactura" value="${esc(state.compraNroFactura||'')}" data-change="compraNroFactura"></div>
        <div class="field">
          <label>Forma de pago</label>
          <select id="cp_formaPago" data-change="compraFormaPago">
            <option value="contado" ${state.compraFormaPago==='contado'?'selected':''}>Contado</option>
            <option value="cuenta corriente" ${state.compraFormaPago==='cuenta corriente'?'selected':''}>Cuenta corriente (queda debiendo)</option>
            <option value="parcial" ${state.compraFormaPago==='parcial'?'selected':''}>Pago parcial</option>
          </select>
        </div>
        ${state.compraFormaPago==='parcial' ? `<div class="field"><label>Monto abonado ahora</label><input id="cp_montoAbonado" type="number" step="0.01" value="${state.compraMontoAbonado}" data-change="compraMontoAbonado"></div>` : ''}
        <div class="totals-box">
          <div class="totals-row total"><span>Total</span><span>${money(compraCartTotal())}</span></div>
        </div>
        <button class="btn btn-primary" style="width:100%; margin-top:14px;" data-action="confirmarCompra">Confirmar compra</button>
      </div>
    </div>
    <style>@media(max-width:960px){.compras-grid{grid-template-columns:1fr !important;}}</style>`;
  wireProductoPicker('cp_search','cp_results', (p) => {
    if(!p) return;
    state.compraCart.push({productoId:p.id, codigoProveedor:p.codigoProveedor, descripcion:p.descripcion, cantidad:1, costoUnitario:Number(p.costoUltimo)||0, esNuevo:false});
    renderCompras();
  });
  if(!proveedor){
    const input = document.getElementById('cp_provSearch');
    const results = document.getElementById('cp_provResults');
    if(input){
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        if(!q){ results.style.display='none'; return; }
        const matches = state.proveedores.filter(p => (p.nombre||'').toLowerCase().includes(q)).slice(0,10);
        results.innerHTML = matches.length ? matches.map(p=>`<div class="opt" data-pid="${p.id}">${esc(p.nombre)}</div>`).join('') : `<div class="opt muted">Sin resultados</div>`;
        results.style.display='block';
        Array.from(results.querySelectorAll('[data-pid]')).forEach(opt=>{
          opt.addEventListener('click', ()=>{ state.compraProveedor = opt.dataset.pid; renderCompras(); });
        });
      });
    }
  }
}

function nuevoRenglonFormHtml(){
  return `
    <div class="modal-head"><h2>Producto nuevo</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="field"><label>Descripción</label><input id="nr_descripcion" placeholder="Ej: Correa distribución Corsa"></div>
    <div class="row2">
      <div class="field"><label>Código proveedor/fabricante</label><input id="nr_codigo"></div>
      <div class="field"><label>Rubro</label><select id="nr_rubro">${RUBROS.map(r=>`<option>${r}</option>`).join('')}</select></div>
    </div>
    <div class="row2">
      <div class="field"><label>Cantidad</label><input id="nr_cantidad" type="number" min="1" step="1" value="1"></div>
      <div class="field"><label>Costo unitario</label><input id="nr_costo" type="number" min="0" step="0.01" value="0"></div>
    </div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="agregarRenglonNuevo">Agregar al carrito</button>
    </div>`;
}

function comprasFiltradas(){
  const q = (state.comprasHistBusqueda||'').toLowerCase().trim();
  return state.compras
    .filter(c => fechaEnRango(c.fecha, state.reporteRango))
    .filter(c => !q || (c.proveedorNombre||'').toLowerCase().includes(q) || (c.nroFacturaProveedor||'').toLowerCase().includes(q))
    .sort((a,b)=>b.createdAt-a.createdAt);
}

function renderComprasHistorial(){
  const list = comprasFiltradas();
  const totalVigente = list.filter(c=>!c.anulada).reduce((s,c)=>s+c.total,0);
  document.getElementById('comprasTabBody').innerHTML = `
    <div class="section-head">
      <div class="row2" style="display:flex; gap:10px; align-items:center;">
        <select id="ch_rango" data-change="comprasHistRango">${RANGO_OPCIONES.map(r=>`<option value="${r.id}" ${state.reporteRango===r.id?'selected':''}>${r.label}</option>`).join('')}</select>
        <input id="ch_busqueda" placeholder="Buscar por proveedor o N° factura…" value="${esc(state.comprasHistBusqueda)}" data-input="comprasHistBusqueda" style="width:240px;">
      </div>
      <button class="btn" data-action="comprasHistExcel">⬇ Descargar Excel</button>
    </div>
    <div class="stat" style="max-width:260px; margin-bottom:16px;"><div class="label">Total del período (sin anuladas)</div><div class="value">${money(totalVigente)}</div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Proveedor</th><th>N° factura</th><th>Total</th><th>Forma de pago</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(c=>`
            <tr>
              <td class="muted">${esc(c.fecha)}</td>
              <td>${esc(c.proveedorNombre)}</td>
              <td class="muted">${esc(c.nroFacturaProveedor||'—')}</td>
              <td>${money(c.total)}</td>
              <td class="muted">${esc(c.formaPago)}</td>
              <td>${estadoMovPill(c)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm" data-action="verCompraHistorial" data-id="${c.id}">Ver</button>
                ${!c.anulada ? `<button class="btn btn-sm btn-danger" data-action="anularCompra" data-id="${c.id}">Anular</button>` : ''}
              </td>
            </tr>`).join('') : `<tr><td colspan="7" class="empty">No hay compras en este período.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function compraDetalleHtml(compra){
  return `
    <div class="modal-head"><h2>Compra — ${esc(compra.proveedorNombre)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="row2" style="margin-bottom:14px;">
      <div><span class="muted" style="font-size:12.5px;">Fecha</span><div>${esc(compra.fecha)}</div></div>
      <div><span class="muted" style="font-size:12.5px;">Estado</span><div>${estadoMovPill(compra)}</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Producto</th><th>Cant.</th><th>Costo unit.</th><th>Subtotal</th></tr></thead>
        <tbody>${(compra.items||[]).map(it=>`<tr><td>${esc(it.descripcion)}</td><td>${it.cantidad}</td><td>${money(it.costoUnitario)}</td><td>${money(Number(it.cantidad)*Number(it.costoUnitario))}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="totals-box">
      <div class="totals-row"><span>Forma de pago</span><span>${esc(compra.formaPago)}</span></div>
      ${compra.saldoPendiente>0 ? `<div class="totals-row"><span>Saldo pendiente</span><span>${money(compra.saldoPendiente)}</span></div>` : ''}
      <div class="totals-row total"><span>Total</span><span>${money(compra.total)}</span></div>
    </div>
    ${compra.anulada ? `<p class="muted" style="font-size:12px; margin-top:10px;">Anulada el ${fmtDate(compra.anuladaAt)}${compra.anuladaMotivo?' — '+esc(compra.anuladaMotivo):''}</p>` : ''}`;
}

async function anularCompraEjecutar(id, motivo){
  const c = state.compras.find(x=>x.id===id);
  if(!c || c.anulada) return;
  const b = newBatch();
  let stockNegativo = false;
  (c.items||[]).forEach(it => {
    const p = it.productoId ? findProducto(it.productoId) : null;
    if(p){
      const nuevoStock = (Number(p.stock)||0) - Number(it.cantidad);
      if(nuevoStock < 0) stockNegativo = true;
      b.update('productos', p.id, {stock:nuevoStock});
    }
  });
  if(c.proveedorId && Number(c.saldoPendiente)>0){
    const p = findProveedor(c.proveedorId);
    if(p) b.update('proveedores', p.id, {saldo:(Number(p.saldo)||0) - Number(c.saldoPendiente)});
  }
  b.update('compras', id, {anulada:true, anuladaAt:Date.now(), anuladaMotivo:motivo||''});
  markSaving();
  await b.commit(); doneSaving();
  toast(stockNegativo ? 'Compra anulada. Ojo: algún producto quedó con stock negativo (ya se había vendido esa mercadería).' : 'Compra anulada. Stock y saldo revertidos.');
}

Object.assign(actions, {
  comprasTab(el){ state.comprasTab = el.dataset.tab; render(); },
  comprasHistExcel(el){
    const list = comprasFiltradas();
    descargarTablaExcel(el, 'compras-' + todayISO() + '.xlsx', 'Compras',
      ['Fecha','Proveedor','N° factura','Total','Forma de pago','Estado'],
      list.map(c => [c.fecha, c.proveedorNombre, c.nroFacturaProveedor||'', c.total, c.formaPago, c.anulada?'Anulada':'Confirmada'])
    );
  },
  verCompraHistorial(el){
    const c = state.compras.find(x=>x.id===el.dataset.id);
    if(!c) return;
    openModal(compraDetalleHtml(c), {wide:true});
  },
  anularCompra(el){ openModal(anularFormHtml('compras', el.dataset.id)); },
  confirmarAnularCompra(el){
    const motivo = document.getElementById('an_motivo').value.trim();
    closeModal();
    anularCompraEjecutar(el.dataset.id, motivo).catch(err => { console.error(err); toast('No se pudo anular la compra.'); });
  },
  compraQuitarLinea(el){ state.compraCart.splice(Number(el.dataset.i),1); renderCompras(); },
  compraQuitarProveedor(){ state.compraProveedor = null; renderCompras(); },
  compraNuevoRenglon(){ openModal(nuevoRenglonFormHtml()); },
  agregarRenglonNuevo(){
    const descripcion = document.getElementById('nr_descripcion').value.trim();
    if(!descripcion){ toast('Falta la descripción.'); return; }
    state.compraCart.push({
      productoId:null, esNuevo:true,
      codigoProveedor: document.getElementById('nr_codigo').value.trim(),
      rubro: document.getElementById('nr_rubro').value,
      descripcion,
      cantidad: Math.max(1, Number(document.getElementById('nr_cantidad').value)||1),
      costoUnitario: Math.max(0, Number(document.getElementById('nr_costo').value)||0)
    });
    closeModal(); renderCompras();
  },
  confirmarCompra(el){
    if(!state.compraCart.length){ toast('Agregá al menos una línea.'); return; }
    if(!state.compraProveedor){ toast('Elegí un proveedor.'); return; }
    const proveedor = findProveedor(state.compraProveedor);
    const total = compraCartTotal();
    let montoAbonado = total, saldoPendiente = 0;
    if(state.compraFormaPago === 'cuenta corriente'){ montoAbonado = 0; saldoPendiente = total; }
    else if(state.compraFormaPago === 'parcial'){ montoAbonado = Number(state.compraMontoAbonado)||0; saldoPendiente = Math.max(0, total - montoAbonado); }

    withBusyButton(el, 'Guardando…', async () => {
      const b = newBatch();
      const resolvedItems = [];
      state.compraCart.forEach(l => {
        if(l.esNuevo){
          const newId = collectionRef('productos').newId();
          b.set('productos', newId, {
            codigoInterno: padCodigo(nextNumero('producto')),
            codigoProveedor: l.codigoProveedor||'', descripcion: l.descripcion, rubro: l.rubro||'Otro',
            compatibilidad:'', stock: Number(l.cantidad), stockMinimo: 1,
            costoUltimo: Number(l.costoUnitario), precioVenta: 0, proveedorHabitualId: proveedor.id,
            ubicacion:'', activo:true, createdAt: Date.now()
          });
          bumpCounter('producto');
          resolvedItems.push({productoId:newId, descripcion:l.descripcion, cantidad:Number(l.cantidad), costoUnitario:Number(l.costoUnitario)});
        } else {
          const p = findProducto(l.productoId);
          if(p) b.update('productos', p.id, {stock:(Number(p.stock)||0)+Number(l.cantidad), costoUltimo:Number(l.costoUnitario)});
          resolvedItems.push({productoId:l.productoId, descripcion:l.descripcion, cantidad:Number(l.cantidad), costoUnitario:Number(l.costoUnitario)});
        }
      });
      const compraId = collectionRef('compras').newId();
      b.set('compras', compraId, {
        fecha: todayISO(), proveedorId: proveedor.id, proveedorNombre: proveedor.nombre,
        items: resolvedItems, total, formaPago: state.compraFormaPago, montoAbonado, saldoPendiente,
        origenOCR: !!state.compraOrigenOCR, nroFacturaProveedor: state.compraNroFactura||'',
        anulada:false, createdAt: Date.now()
      });
      if(saldoPendiente > 0){ b.update('proveedores', proveedor.id, {saldo:(Number(proveedor.saldo)||0)+saldoPendiente}); }
      markSaving();
      await b.commit(); doneSaving();
      state.compraCart = []; state.compraProveedor = null; state.compraFormaPago = 'contado';
      state.compraMontoAbonado = 0; state.compraNroFactura = ''; state.compraOrigenOCR = false;
      toast('Compra confirmada. Stock actualizado.');
      goSection('compras');
    });
  }
});

inputActions.compraCantidad = (el) => { state.compraCart[Number(el.dataset.i)].cantidad = Math.max(1, Number(el.value)||1); renderCompras(); };
inputActions.compraCosto = (el) => { state.compraCart[Number(el.dataset.i)].costoUnitario = Math.max(0, Number(el.value)||0); renderCompras(); };
inputActions.compraFormaPago = (el) => { state.compraFormaPago = el.value; renderCompras(); };
inputActions.compraMontoAbonado = (el) => { state.compraMontoAbonado = Number(el.value)||0; };
inputActions.compraNroFactura = (el) => { state.compraNroFactura = el.value; };
inputActions.comprasHistBusqueda = (el) => { state.comprasHistBusqueda = el.value; renderComprasHistorial(); };
inputActions.comprasHistRango = (el) => { state.reporteRango = el.value; renderComprasHistorial(); };
