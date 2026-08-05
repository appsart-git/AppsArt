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
        <button class="btn btn-sm" style="margin-top:10px;" data-action="ventaNuevoProductoSinStock">+ Vender producto nuevo (no está en el catálogo)</button>
        <div class="table-wrap" style="margin-top:14px;">
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Desc. %</th><th>Subtotal</th><th></th></tr></thead>
            <tbody>
              ${state.cart.length ? state.cart.map((l,i)=>`
                <tr>
                  <td>${esc(l.descripcion)}${l.esNuevo?' <span class="pill pill-info">Nuevo</span>':''}<div class="muted" style="font-size:11px;">${esc(l.codigoInterno||'')}</div>
                    ${l.esNuevo
                      ? `<div style="font-size:11px; color:var(--text-muted); margin-top:5px;">🆕 Producto nuevo · venta sin stock</div>`
                      : `<label style="display:flex; align-items:center; gap:5px; margin-top:5px; font-size:11px; font-weight:600; text-transform:none; color:var(--text-muted); cursor:pointer;">
                          <input type="checkbox" data-action="ventaToggleSinStock" data-i="${i}" ${l.sinStock?'checked':''} style="width:auto;">
                          Venta sin stock
                        </label>`}
                    <input type="text" placeholder="Vehículo (marca y modelo)" value="${esc(l.vehiculo||'')}" data-input="ventaVehiculo" data-i="${i}" style="margin-top:5px; font-size:12px; padding:5px 8px;">
                  </td>
                  <td><input class="cart-line-input" type="number" min="1" step="1" value="${l.cantidad}" data-change="ventaCantidad" data-i="${i}"></td>
                  <td><input class="cart-line-input" type="number" min="0" step="0.01" value="${l.precioUnitario}" data-change="ventaPrecio" data-i="${i}"></td>
                  <td><input class="cart-line-input" type="number" min="0" max="100" step="1" value="${l.descuentoPct}" data-change="ventaDescuento" data-i="${i}"></td>
                  <td>${money(cartLineTotal(l))}</td>
                  <td><button class="btn btn-sm btn-icon btn-danger" data-action="ventaQuitarLinea" data-i="${i}">✕</button></td>
                </tr>
                ${l.sinStock ? `
                <tr>
                  <td colspan="6" style="background:var(--panel2); border-radius:8px;">
                    <div class="row3" style="padding:10px; gap:10px;">
                      <div class="field" style="margin-bottom:0;">
                        <label>Proveedor</label>
                        ${l.sinStockProveedorId ? `<div style="display:flex; align-items:center; gap:8px;"><b>${esc(l.sinStockProveedorNombre)}</b><button class="btn btn-sm" data-action="ventaSinStockQuitarProveedor" data-i="${i}">Cambiar</button></div>`
                          : `<input id="vt_ssProv_${i}" placeholder="Buscar proveedor…" autocomplete="off"><div class="cart-search-results" id="vt_ssProvResults_${i}" style="display:none;"></div>`}
                      </div>
                      <div class="field" style="margin-bottom:0;"><label>Costo unitario</label><input type="number" min="0" step="0.01" value="${l.sinStockCosto}" data-change="ventaSinStockCosto" data-i="${i}"></div>
                      <div class="field" style="margin-bottom:0;"><label>Pago al proveedor</label>
                        <select data-change="ventaSinStockFormaPago" data-i="${i}">
                          <option value="contado" ${l.sinStockFormaPago==='contado'?'selected':''}>Contado</option>
                          <option value="cuenta corriente" ${l.sinStockFormaPago==='cuenta corriente'?'selected':''}>Cuenta corriente</option>
                        </select>
                      </div>
                    </div>
                    <p class="muted" style="font-size:11px; padding:0 10px 8px;">Se compra directo al proveedor y se despacha al cliente sin pasar por el stock: genera una compra vinculada, el stock del producto no se mueve.</p>
                  </td>
                </tr>` : ''}`).join('') : `<tr><td colspan="6" class="empty">Carrito vacío. Buscá un producto arriba para agregarlo.</td></tr>`}
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
    state.cart.push({
      productoId:p.id, codigoInterno:p.codigoInterno, descripcion:p.descripcion, cantidad:1,
      precioUnitario:Number(p.precioVenta)||0, costoUnitario:Number(p.costoUltimo)||0, descuentoPct:0, stockDisponible:Number(p.stock)||0,
      vehiculo:'',
      sinStock:false, sinStockProveedorId:null, sinStockProveedorNombre:'', sinStockCosto:0, sinStockFormaPago:'contado'
    });
    renderVentas();
  });
  state.cart.forEach((l,i) => {
    if(l.sinStock && !l.sinStockProveedorId){
      const input = document.getElementById('vt_ssProv_'+i);
      const results = document.getElementById('vt_ssProvResults_'+i);
      if(input){
        input.addEventListener('input', () => {
          const q = input.value.toLowerCase().trim();
          if(!q){ results.style.display='none'; return; }
          const matches = state.proveedores.filter(pr => (pr.nombre||'').toLowerCase().includes(q)).slice(0,10);
          results.innerHTML = matches.length ? matches.map(pr=>`<div class="opt" data-pid="${pr.id}">${esc(pr.nombre)}</div>`).join('') : `<div class="opt muted">Sin resultados</div>`;
          results.style.display='block';
          Array.from(results.querySelectorAll('[data-pid]')).forEach(opt=>{
            opt.addEventListener('click', ()=>{
              const prov = findProveedor(opt.dataset.pid);
              state.cart[i].sinStockProveedorId = prov.id;
              state.cart[i].sinStockProveedorNombre = prov.nombre;
              renderVentaNueva();
            });
          });
        });
      }
    }
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

function ventaNuevoProductoFormHtml(){
  return `
    <div class="modal-head"><h2>Vender producto nuevo (sin stock)</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <p class="muted" style="font-size:12.5px;">Para algo que no está en tu catálogo: se da de alta el producto, se vende sin pasar por stock, y se genera la compra al proveedor.</p>
    <div class="field"><label>Descripción</label><input id="np_descripcion" placeholder="Ej: Correa distribución Corsa"></div>
    <div class="row2">
      <div class="field"><label>Código proveedor/fabricante (opcional)</label><input id="np_codigo"></div>
      <div class="field"><label>Rubro</label><select id="np_rubro">${RUBROS.map(r=>`<option>${r}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Vehículo (opcional)</label><input id="np_vehiculo" placeholder="Ej: Fiat Cronos 2020 — dejalo vacío si es un insumo genérico"></div>
    <div class="row2">
      <div class="field"><label>Cantidad</label><input id="np_cantidad" type="number" min="1" step="1" value="1"></div>
      <div class="field"><label>Precio de venta (al cliente)</label><input id="np_precioVenta" type="number" min="0" step="0.01" value="0"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Proveedor</label>
        <select id="np_proveedorId">
          <option value="">— Elegir —</option>
          ${state.proveedores.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).map(pr=>`<option value="${pr.id}">${esc(pr.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Costo unitario</label><input id="np_costo" type="number" min="0" step="0.01" value="0"></div>
    </div>
    <div class="field"><label>Pago al proveedor</label>
      <select id="np_formaPago">
        <option value="contado">Contado</option>
        <option value="cuenta corriente">Cuenta corriente</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="agregarVentaProductoNuevoSinStock">Agregar a la venta</button>
    </div>`;
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
              <td>${esc(v.clienteNombre)}${(v.items||[]).some(it=>it.sinStock)?' <span class="pill pill-info">Sin stock</span>':''}</td>
              <td>${money(v.total)}</td>
              <td class="muted">${esc(v.formaPago)}</td>
              <td>${estadoMovPill(v)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm" data-action="verVentaHistorial" data-id="${v.id}">Ver</button>
                ${!v.anulada ? `<button class="btn btn-sm" data-action="editarVenta" data-id="${v.id}">Editar</button>
                <button class="btn btn-sm btn-danger" data-action="anularVenta" data-id="${v.id}">Anular</button>` : ''}
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

function editarVentaFormHtml(id){
  const v = state.ventas.find(x=>x.id===id);
  const tieneSinStock = v && (v.items||[]).some(it=>it.sinStock);
  return `
    <div class="modal-head"><h2>Editar venta N° ${v?String(v.numero).padStart(5,'0'):''}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <p class="muted" style="font-size:13px;">No se edita en el lugar: se anula esta venta${tieneSinStock?' (y la compra que generó por venta sin stock)':''} y se precarga el mismo carrito en "Nueva venta" para que corrijas lo que haga falta y confirmes de nuevo.</p>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="confirmarEditarVenta" data-id="${id}">Anular y corregir</button>
    </div>`;
}

async function editarVentaEjecutar(id){
  const v = state.ventas.find(x=>x.id===id);
  if(!v || v.anulada) return;

  const cart = (v.items||[]).map(it => {
    const p = it.productoId ? findProducto(it.productoId) : null;
    const line = {
      productoId: it.productoId, codigoInterno: p?p.codigoInterno:'', descripcion: it.descripcion,
      cantidad: Number(it.cantidad), precioUnitario: Number(it.precioUnitario),
      costoUnitario: Number(it.costoUnitario)||0, descuentoPct: Number(it.descuentoPct)||0,
      stockDisponible: p?Number(p.stock)||0:0, vehiculo: it.vehiculo||'',
      sinStock: !!it.sinStock, sinStockProveedorId:null, sinStockProveedorNombre:'',
      sinStockCosto: Number(it.costoUnitario)||0, sinStockFormaPago:'contado'
    };
    if(it.sinStock){
      const compraVinculada = state.compras.find(c => c.ventaVinculadaId===id && !c.anulada && (c.items||[]).some(ci=>ci.productoId===it.productoId));
      if(compraVinculada){
        line.sinStockProveedorId = compraVinculada.proveedorId;
        line.sinStockProveedorNombre = compraVinculada.proveedorNombre;
        line.sinStockFormaPago = compraVinculada.formaPago;
      }
    }
    return line;
  });
  const comprasVinculadas = state.compras.filter(c => c.ventaVinculadaId===id && !c.anulada);

  await anularVentaEjecutar(id, 'Editada para corrección');
  for(const c of comprasVinculadas){
    await anularCompraEjecutar(c.id, 'Venta editada para corrección');
  }

  state.cart = cart;
  state.ventaCliente = v.clienteId;
  state.ventaFormaPago = v.formaPago;
  state.ventaMontoAbonado = v.formaPago==='parcial' ? Number(v.montoAbonado)||0 : 0;
  state.ventasTab = 'nueva';
  goSection('ventas');
  toast('Venta anulada. Corregí los datos y confirmá de nuevo.');
}

async function anularVentaEjecutar(id, motivo){
  const v = state.ventas.find(x=>x.id===id);
  if(!v || v.anulada) return;
  const b = newBatch();
  (v.items||[]).forEach(it => {
    if(it.sinStock) return; // nunca descontó stock (venta sin stock), no hay nada que devolver
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
  editarVenta(el){ openModal(editarVentaFormHtml(el.dataset.id)); },
  confirmarEditarVenta(el){
    const id = el.dataset.id;
    closeModal();
    editarVentaEjecutar(id).catch(err => { console.error(err); toast('No se pudo editar la venta.'); });
  },
  ventaQuitarLinea(el){ state.cart.splice(Number(el.dataset.i),1); renderVentas(); },
  ventaQuitarCliente(){ state.ventaCliente = null; renderVentas(); },
  ventaToggleSinStock(el){
    const i = Number(el.dataset.i);
    const l = state.cart[i];
    l.sinStock = el.checked;
    if(l.sinStock){
      const p = findProducto(l.productoId);
      if(!l.sinStockProveedorId && p && p.proveedorHabitualId){
        const prov = findProveedor(p.proveedorHabitualId);
        if(prov){ l.sinStockProveedorId = prov.id; l.sinStockProveedorNombre = prov.nombre; }
      }
      if(!l.sinStockCosto) l.sinStockCosto = Number(p && p.costoUltimo)||0;
      if(!l.sinStockFormaPago) l.sinStockFormaPago = 'contado';
    }
    renderVentaNueva();
  },
  ventaSinStockQuitarProveedor(el){
    const l = state.cart[Number(el.dataset.i)];
    l.sinStockProveedorId = null; l.sinStockProveedorNombre = '';
    renderVentaNueva();
  },
  ventaNuevoProductoSinStock(){
    if(!state.proveedores.length){ toast('Primero cargá al menos un proveedor (sección Proveedores).'); return; }
    openModal(ventaNuevoProductoFormHtml());
  },
  agregarVentaProductoNuevoSinStock(){
    const descripcion = document.getElementById('np_descripcion').value.trim();
    const proveedorId = document.getElementById('np_proveedorId').value;
    const costo = Number(document.getElementById('np_costo').value)||0;
    const precioVenta = Number(document.getElementById('np_precioVenta').value)||0;
    const cantidad = Math.max(1, Number(document.getElementById('np_cantidad').value)||1);
    if(!descripcion){ toast('Falta la descripción.'); return; }
    if(!proveedorId){ toast('Elegí el proveedor.'); return; }
    if(!(costo > 0)){ toast('Cargá el costo unitario.'); return; }
    const proveedor = findProveedor(proveedorId);
    state.cart.push({
      productoId:null, esNuevo:true,
      codigoProveedor: document.getElementById('np_codigo').value.trim(),
      rubro: document.getElementById('np_rubro').value,
      codigoInterno:'', descripcion, cantidad,
      precioUnitario: precioVenta, costoUnitario: costo, descuentoPct:0, stockDisponible:0,
      vehiculo: document.getElementById('np_vehiculo').value.trim(),
      sinStock:true, sinStockProveedorId:proveedor.id, sinStockProveedorNombre:proveedor.nombre,
      sinStockCosto:costo, sinStockFormaPago: document.getElementById('np_formaPago').value
    });
    closeModal();
    renderVentaNueva();
  },
  confirmarVenta(el){
    if(!state.cart.length){ toast('Agregá al menos un producto.'); return; }
    for(const l of state.cart){
      if(l.sinStock){
        if(!l.sinStockProveedorId){ toast(`Elegí el proveedor de "${l.descripcion}" (venta sin stock).`); return; }
        if(!(Number(l.sinStockCosto) > 0)){ toast(`Cargá el costo de "${l.descripcion}" (venta sin stock).`); return; }
        continue;
      }
      const p = findProducto(l.productoId);
      if(p && Number(l.cantidad) > Number(p.stock)){
        toast(`Stock insuficiente de "${l.descripcion}" (disponible: ${p.stock}). Marcá "Venta sin stock" si se despacha directo del proveedor.`);
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
      // Saldo total de la cuenta corriente del cliente inmediatamente después de esta venta — se guarda
      // como foto fija en el comprobante para que "Saldo pendiente" muestre la deuda total. Se calcula
      // siempre que haya cliente (aunque esta venta sea contado, por si ya tenía deuda de antes) y se
      // lee fresco del servidor (no de state.clientes) para que no arrastre un valor viejo si se cargan
      // varias ventas seguidas para el mismo cliente.
      const saldoClienteAntes = cliente ? await leerSaldoFresco('clientes', cliente.id) : 0;
      const saldoClienteTotal = cliente ? saldoClienteAntes + saldoPendiente : 0;

      const numero = nextNumero('venta');
      const ventaId = collectionRef('ventas').newId();
      const b = newBatch();

      // Las líneas "producto nuevo" todavía no tienen productoId: se da de alta el producto acá,
      // en el mismo batch, y de ahí en más se referencia por su id nuevo (igual que hace Compras
      // con "Cargar producto nuevo").
      const resolvedProductoIds = state.cart.map(l => l.productoId);
      state.cart.forEach((l,i) => {
        if(!l.esNuevo) return;
        const newProductoId = collectionRef('productos').newId();
        b.set('productos', newProductoId, {
          codigoInterno: padCodigo(nextNumero('producto')),
          codigoProveedor: l.codigoProveedor||'', descripcion: l.descripcion, rubro: l.rubro||'Otro',
          compatibilidad:'', stock: 0, stockMinimo: 1,
          costoUltimo: Number(l.sinStockCosto)||0, precioVenta: Number(l.precioUnitario)||0,
          proveedorHabitualId: l.sinStockProveedorId||null,
          ubicacion:'', activo:true, createdAt: Date.now()
        });
        bumpCounter('producto');
        resolvedProductoIds[i] = newProductoId;
      });

      const ventaData = {
        numero, fecha: todayISO(),
        clienteId: cliente ? cliente.id : null,
        clienteNombre: cliente ? cliente.nombre : 'Consumidor final',
        items: state.cart.map((l,i) => ({
          productoId: resolvedProductoIds[i], descripcion:l.descripcion, cantidad:Number(l.cantidad),
          precioUnitario:Number(l.precioUnitario),
          costoUnitario: l.sinStock ? Number(l.sinStockCosto)||0 : Number(l.costoUnitario)||0,
          descuentoPct:Number(l.descuentoPct),
          vehiculo: (l.vehiculo||'').trim(),
          sinStock: !!l.sinStock
        })),
        subtotal, descuentoTotal, total, formaPago: state.ventaFormaPago, montoAbonado, saldoPendiente, saldoClienteTotal,
        anulada:false, createdAt: Date.now()
      };
      b.set('ventas', ventaId, ventaData);

      state.cart.forEach(l => {
        if(l.esNuevo) return; // costoUltimo/precioVenta ya quedaron seteados al crear el producto arriba
        const p = findProducto(l.productoId);
        if(l.sinStock){
          if(p) b.update('productos', p.id, {costoUltimo: Number(l.sinStockCosto)});
        } else if(p){
          b.update('productos', p.id, {stock: Number(p.stock) - Number(l.cantidad)});
        }
      });
      if(cliente && saldoPendiente > 0){
        b.update('clientes', cliente.id, {saldo: (Number(cliente.saldo)||0) + saldoPendiente});
      }

      // Cada línea "venta sin stock" genera además una compra al proveedor, vinculada a esta venta.
      // El stock del producto no se toca en ningún lado de esta transacción: nunca pasó por el estante.
      const lineasSinStock = state.cart.map((l,i) => ({l,i})).filter(x => x.l.sinStock);
      lineasSinStock.forEach(({l,i}) => {
        const proveedor = findProveedor(l.sinStockProveedorId);
        const compraTotal = Number(l.cantidad) * Number(l.sinStockCosto);
        let compraMontoAbonado = compraTotal, compraSaldoPendiente = 0;
        if(l.sinStockFormaPago === 'cuenta corriente'){ compraMontoAbonado = 0; compraSaldoPendiente = compraTotal; }
        const compraId = collectionRef('compras').newId();
        b.set('compras', compraId, {
          fecha: todayISO(), proveedorId: proveedor.id, proveedorNombre: proveedor.nombre,
          items: [{productoId:resolvedProductoIds[i], descripcion:l.descripcion, cantidad:Number(l.cantidad), costoUnitario:Number(l.sinStockCosto), vehiculo:(l.vehiculo||'').trim()}],
          total: compraTotal, formaPago: l.sinStockFormaPago, montoAbonado: compraMontoAbonado, saldoPendiente: compraSaldoPendiente,
          origenOCR:false, sinStock:true, ventaVinculadaId: ventaId, nroFacturaProveedor:'',
          anulada:false, createdAt: Date.now()
        });
        if(compraSaldoPendiente > 0){
          b.update('proveedores', proveedor.id, {saldo:(Number(proveedor.saldo)||0) + compraSaldoPendiente});
        }
      });

      markSaving();
      await b.commit(); doneSaving();
      bumpCounter('venta');
      state.cart = []; state.ventaCliente = null; state.ventaFormaPago = 'contado'; state.ventaMontoAbonado = 0;
      toast('Venta confirmada.' + (lineasSinStock.length ? ' Se generó la compra al proveedor por venta sin stock.' : ''));
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
inputActions.ventaVehiculo = (el) => { state.cart[Number(el.dataset.i)].vehiculo = el.value; };
inputActions.ventaSinStockCosto = (el) => { state.cart[Number(el.dataset.i)].sinStockCosto = Math.max(0, Number(el.value)||0); };
inputActions.ventaSinStockFormaPago = (el) => { state.cart[Number(el.dataset.i)].sinStockFormaPago = el.value; };
