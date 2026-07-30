'use strict';
/* ===================== VENTAS (POS) ===================== */

function cartLineTotal(l){ return (Number(l.cantidad)||0) * (Number(l.precioUnitario)||0) * (1 - (Number(l.descuentoPct)||0)/100); }
function cartSubtotal(){ return state.cart.reduce((s,l)=> s + (Number(l.cantidad)||0)*(Number(l.precioUnitario)||0), 0); }
function cartTotal(){ return state.cart.reduce((s,l)=> s + cartLineTotal(l), 0); }
function cartDescuentoTotal(){ return cartSubtotal() - cartTotal(); }

function renderVentas(){
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Ventas</h1></div>
    <div class="tabs">
      <div class="tab ${state.ventasTab!=='historial'?'active':''}" data-action="ventasTab" data-tab="nueva">Nueva venta</div>
      <div class="tab ${state.ventasTab==='historial'?'active':''}" data-action="ventasTab" data-tab="historial">Historial</div>
    </div>
    <div id="ventasTabBody"></div>`;
  if(state.ventasTab === 'historial') renderVentasHistorial();
  else renderVentaNueva();
}

function renderVentaNueva(){
  const cliente = state.ventaCliente ? findCliente(state.ventaCliente) : null;
  document.getElementById('ventasTabBody').innerHTML = `
    <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:18px; align-items:start;" class="ventas-grid">
      <div class="card">
        <label>Agregar producto</label>
        ${productoPickerHtml('vt_search','vt_results')}
        <div class="table-wrap" style="margin-top:14px;">
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Desc. %</th><th>Subtotal</th><th></th></tr></thead>
            <tbody>
              ${state.cart.length ? state.cart.map((l,i)=>`
                <tr>
                  <td>${esc(l.descripcion)}<div class="muted" style="font-size:11px;">${esc(l.codigoInterno||'')}</div></td>
                  <td><input class="cart-line-input" type="number" min="1" step="1" value="${l.cantidad}" data-change="ventaCantidad" data-i="${i}"></td>
                  <td><input class="cart-line-input" type="number" min="0" step="0.01" value="${l.precioUnitario}" data-change="ventaPrecio" data-i="${i}"></td>
                  <td><input class="cart-line-input" type="number" min="0" max="100" step="1" value="${l.descuentoPct}" data-change="ventaDescuento" data-i="${i}"></td>
                  <td>${money(cartLineTotal(l))}</td>
                  <td><button class="btn btn-sm btn-icon btn-danger" data-action="ventaQuitarLinea" data-i="${i}">✕</button></td>
                </tr>`).join('') : `<tr><td colspan="6" class="empty">Carrito vacío. Buscá un producto arriba para agregarlo.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="field">
          <label>Cliente</label>
          ${cliente ? `<div class="row2" style="align-items:center;"><div><b>${esc(cliente.nombre)}</b><div class="muted" style="font-size:12px;">${esc(cliente.telefono||'')}</div></div><button class="btn btn-sm" data-action="ventaQuitarCliente">Quitar</button></div>`
            : `<input id="vt_clienteSearch" placeholder="Buscar cliente… (vacío = consumidor final)" autocomplete="off"><div class="cart-search-results" id="vt_clienteResults" style="display:none;"></div>`}
        </div>
        <div class="field">
          <label>Forma de pago</label>
          <select id="vt_formaPago" data-change="ventaFormaPago">
            <option value="contado" ${state.ventaFormaPago==='contado'?'selected':''}>Contado</option>
            <option value="cuenta corriente" ${state.ventaFormaPago==='cuenta corriente'?'selected':''}>Cuenta corriente (todo fiado)</option>
            <option value="parcial" ${state.ventaFormaPago==='parcial'?'selected':''}>Pago parcial</option>
          </select>
        </div>
        ${state.ventaFormaPago==='parcial' ? `<div class="field"><label>Monto abonado ahora</label><input id="vt_montoAbonado" type="number" step="0.01" value="${state.ventaMontoAbonado}" data-change="ventaMontoAbonado"></div>` : ''}
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span>${money(cartSubtotal())}</span></div>
          <div class="totals-row"><span>Descuentos</span><span>-${money(cartDescuentoTotal())}</span></div>
          <div class="totals-row total"><span>Total</span><span>${money(cartTotal())}</span></div>
        </div>
        <button class="btn btn-primary" style="width:100%; margin-top:14px;" data-action="confirmarVenta">Confirmar venta</button>
      </div>
    </div>
    <style>@media(max-width:960px){.ventas-grid{grid-template-columns:1fr !important;}}</style>`;
  wireProductoPicker('vt_search','vt_results', (p) => {
    if(!p) return;
    state.cart.push({productoId:p.id, codigoInterno:p.codigoInterno, descripcion:p.descripcion, cantidad:1, precioUnitario:Number(p.precioVenta)||0, costoUnitario:Number(p.costoUltimo)||0, descuentoPct:0, stockDisponible:Number(p.stock)||0});
    renderVentas();
  });
  if(!cliente){
    const input = document.getElementById('vt_clienteSearch');
    const results = document.getElementById('vt_clienteResults');
    if(input){
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        if(!q){ results.style.display='none'; return; }
        const matches = state.clientes.filter(c => [c.nombre,c.telefono].some(v=>(v||'').toLowerCase().includes(q))).slice(0,10);
        results.innerHTML = matches.length ? matches.map(c=>`<div class="opt" data-cid="${c.id}">${esc(c.nombre)} <span class="muted">${esc(c.telefono||'')}</span></div>`).join('') : `<div class="opt muted">Sin resultados</div>`;
        results.style.display='block';
        Array.from(results.querySelectorAll('[data-cid]')).forEach(opt=>{
          opt.addEventListener('click', ()=>{ state.ventaCliente = opt.dataset.cid; renderVentas(); });
        });
      });
    }
  }
}

function ventasFiltradas(){
  const q = (state.ventasHistBusqueda||'').toLowerCase().trim();
  return state.ventas
    .filter(v => fechaEnRango(v.fecha, state.reporteRango))
    .filter(v => !q || (v.clienteNombre||'').toLowerCase().includes(q) || String(v.numero).includes(q))
    .sort((a,b)=>b.createdAt-a.createdAt);
}

function renderVentasHistorial(){
  const list = ventasFiltradas();
  const totalVigente = list.filter(v=>!v.anulada).reduce((s,v)=>s+v.total,0);
  document.getElementById('ventasTabBody').innerHTML = `
    <div class="section-head">
      <div class="row2" style="display:flex; gap:10px; align-items:center;">
        <select id="vh_rango" data-change="ventasHistRango">${RANGO_OPCIONES.map(r=>`<option value="${r.id}" ${state.reporteRango===r.id?'selected':''}>${r.label}</option>`).join('')}</select>
        <input id="vh_busqueda" placeholder="Buscar por cliente o N°…" value="${esc(state.ventasHistBusqueda)}" data-input="ventasHistBusqueda" style="width:220px;">
      </div>
      <button class="btn" id="vh_excel" data-action="ventasHistExcel">⬇ Descargar Excel</button>
    </div>
    <div class="stat" style="max-width:260px; margin-bottom:16px;"><div class="label">Total del período (sin anuladas)</div><div class="value">${money(totalVigente)}</div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Forma de pago</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(v=>`
            <tr>
              <td>${v.numero}</td>
              <td class="muted">${esc(v.fecha)}</td>
              <td>${esc(v.clienteNombre)}</td>
              <td>${money(v.total)}</td>
              <td class="muted">${esc(v.formaPago)}</td>
              <td>${estadoMovPill(v)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm" data-action="verVentaHistorial" data-id="${v.id}">Ver</button>
                ${!v.anulada ? `<button class="btn btn-sm btn-danger" data-action="anularVenta" data-id="${v.id}">Anular</button>` : ''}
              </td>
            </tr>`).join('') : `<tr><td colspan="7" class="empty">No hay ventas en este período.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function anularFormHtml(tipo, id){
  return `
    <div class="modal-head"><h2>Anular ${tipo==='ventas'?'venta':'compra'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <p class="muted" style="font-size:13px;">Se va a revertir el stock y el saldo que generó esta ${tipo==='ventas'?'venta':'compra'}. El registro no se borra, queda marcado como anulado para mantener el historial.</p>
    <div class="field"><label>Motivo (opcional)</label><input id="an_motivo" placeholder="Ej: se cargó mal el producto"></div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-danger" data-action="${tipo==='ventas'?'confirmarAnularVenta':'confirmarAnularCompra'}" data-id="${id}">Confirmar anulación</button>
    </div>`;
}

async function anularVentaEjecutar(id, motivo){
  const v = state.ventas.find(x=>x.id===id);
  if(!v || v.anulada) return;
  const b = newBatch();
  (v.items||[]).forEach(it => {
    const p = it.productoId ? findProducto(it.productoId) : null;
    if(p) b.update('productos', p.id, {stock:(Number(p.stock)||0) + Number(it.cantidad)});
  });
  if(v.clienteId && Number(v.saldoPendiente)>0){
    const c = findCliente(v.clienteId);
    if(c) b.update('clientes', c.id, {saldo:(Number(c.saldo)||0) - Number(v.saldoPendiente)});
  }
  b.update('ventas', id, {anulada:true, anuladaAt:Date.now(), anuladaMotivo:motivo||''});
  markSaving();
  await b.commit(); doneSaving();
  toast('Venta anulada. Stock y saldo revertidos.');
}

Object.assign(actions, {
  ventasTab(el){ state.ventasTab = el.dataset.tab; render(); },
  ventasHistExcel(el){
    const list = ventasFiltradas();
    descargarTablaExcel(el, 'ventas-' + todayISO() + '.xlsx', 'Ventas',
      ['N°','Fecha','Cliente','Total','Forma de pago','Estado'],
      list.map(v => [v.numero, v.fecha, v.clienteNombre, v.total, v.formaPago, v.anulada?'Anulada':'Confirmada'])
    );
  },
  verVentaHistorial(el){
    const v = state.ventas.find(x=>x.id===el.dataset.id);
    if(!v) return;
    mostrarComprobante(v, v.clienteId ? findCliente(v.clienteId) : null);
  },
  anularVenta(el){ openModal(anularFormHtml('ventas', el.dataset.id)); },
  confirmarAnularVenta(el){
    const motivo = document.getElementById('an_motivo').value.trim();
    closeModal();
    anularVentaEjecutar(el.dataset.id, motivo).catch(err => { console.error(err); toast('No se pudo anular la venta.'); });
  },
  ventaQuitarLinea(el){ state.cart.splice(Number(el.dataset.i),1); renderVentas(); },
  ventaQuitarCliente(){ state.ventaCliente = null; renderVentas(); },
  confirmarVenta(el){
    if(!state.cart.length){ toast('Agregá al menos un producto.'); return; }
    for(const l of state.cart){
      const p = findProducto(l.productoId);
      if(p && Number(l.cantidad) > Number(p.stock)){
        toast(`Stock insuficiente de "${l.descripcion}" (disponible: ${p.stock}).`);
        return;
      }
    }
    const total = cartTotal();
    const subtotal = cartSubtotal();
    const descuentoTotal = cartDescuentoTotal();
    const cliente = state.ventaCliente ? findCliente(state.ventaCliente) : null;
    let montoAbonado = total, saldoPendiente = 0;
    if(state.ventaFormaPago === 'cuenta corriente'){ montoAbonado = 0; saldoPendiente = total; }
    else if(state.ventaFormaPago === 'parcial'){ montoAbonado = Number(state.ventaMontoAbonado)||0; saldoPendiente = Math.max(0, total - montoAbonado); }
    if(saldoPendiente > 0 && !cliente){ toast('Para vender a cuenta corriente / parcial necesitás elegir un cliente.'); return; }

    withBusyButton(el, 'Guardando…', async () => {
      const numero = nextNumero('venta');
      const ventaId = collectionRef('ventas').newId();
      const ventaData = {
        numero, fecha: todayISO(),
        clienteId: cliente ? cliente.id : null,
        clienteNombre: cliente ? cliente.nombre : 'Consumidor final',
        items: state.cart.map(l => ({productoId:l.productoId, descripcion:l.descripcion, cantidad:Number(l.cantidad), precioUnitario:Number(l.precioUnitario), costoUnitario:Number(l.costoUnitario)||0, descuentoPct:Number(l.descuentoPct)})),
        subtotal, descuentoTotal, total, formaPago: state.ventaFormaPago, montoAbonado, saldoPendiente,
        anulada:false, createdAt: Date.now()
      };
      const b = newBatch();
      b.set('ventas', ventaId, ventaData);
      state.cart.forEach(l => {
        const p = findProducto(l.productoId);
        if(p) b.update('productos', p.id, {stock: Number(p.stock) - Number(l.cantidad)});
      });
      if(cliente && saldoPendiente > 0){
        b.update('clientes', cliente.id, {saldo: (Number(cliente.saldo)||0) + saldoPendiente});
      }
      markSaving();
      await b.commit(); doneSaving();
      bumpCounter('venta');
      state.cart = []; state.ventaCliente = null; state.ventaFormaPago = 'contado'; state.ventaMontoAbonado = 0;
      toast('Venta confirmada.');
      mostrarComprobante(Object.assign({id:ventaId}, ventaData), cliente);
    });
  }
});

inputActions.ventaCantidad = (el) => { state.cart[Number(el.dataset.i)].cantidad = Math.max(1, Number(el.value)||1); renderVentas(); };
inputActions.ventaPrecio = (el) => { state.cart[Number(el.dataset.i)].precioUnitario = Math.max(0, Number(el.value)||0); renderVentas(); };
inputActions.ventaDescuento = (el) => { state.cart[Number(el.dataset.i)].descuentoPct = Math.min(100, Math.max(0, Number(el.value)||0)); renderVentas(); };
inputActions.ventaFormaPago = (el) => { state.ventaFormaPago = el.value; renderVentas(); };
inputActions.ventaMontoAbonado = (el) => { state.ventaMontoAbonado = Number(el.value)||0; };
inputActions.ventasHistBusqueda = (el) => { state.ventasHistBusqueda = el.value; renderVentasHistorial(); };
inputActions.ventasHistRango = (el) => { state.reporteRango = el.value; renderVentasHistorial(); };
