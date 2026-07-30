'use strict';
/* ===================== PANEL (dashboard) + REPORTES ===================== */

function ventasHoy(){ const t = todayISO(); return state.ventas.filter(v=>v.fecha===t); }
function ventasDelMes(){
  const now = new Date(); const ym = now.toISOString().slice(0,7);
  return state.ventas.filter(v => (v.fecha||'').slice(0,7) === ym);
}
function totalCobrar(){ return state.clientes.reduce((s,c)=>s+Math.max(0,Number(c.saldo)||0),0); }
function totalPagar(){ return state.proveedores.reduce((s,p)=>s+Math.max(0,Number(p.saldo)||0),0); }
function productosStockBajo(){ return state.productos.filter(p => p.activo!==false && (Number(p.stock)||0) <= (Number(p.stockMinimo)||0)); }

function renderPanel(){
  const vHoy = ventasHoy(), vMes = ventasDelMes();
  const stockBajo = productosStockBajo();
  const ultimasVentas = state.ventas.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Panel</h1>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-primary" data-action="nav" data-id="ventas">+ Nueva venta</button>
        <button class="btn" data-action="nav" data-id="compras">+ Nueva compra</button>
      </div>
    </div>
    <div class="grid-cards">
      <div class="stat"><div class="label">Ventas de hoy</div><div class="value">${money(vHoy.reduce((s,v)=>s+v.total,0))}</div><div class="muted" style="font-size:12px;">${vHoy.length} venta(s)</div></div>
      <div class="stat"><div class="label">Ventas del mes</div><div class="value">${money(vMes.reduce((s,v)=>s+v.total,0))}</div><div class="muted" style="font-size:12px;">${vMes.length} venta(s)</div></div>
      <div class="stat"><div class="label">Por cobrar</div><div class="value bad">${money(totalCobrar())}</div></div>
      <div class="stat"><div class="label">Por pagar</div><div class="value warn">${money(totalPagar())}</div></div>
      <div class="stat"><div class="label">Stock bajo mínimo</div><div class="value ${stockBajo.length?'warn':''}">${stockBajo.length}</div></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px;" class="panel-grid">
      <div class="card">
        <h3 style="font-size:14px; margin-bottom:10px;">Últimas ventas</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>N°</th><th>Cliente</th><th>Total</th></tr></thead>
          <tbody>${ultimasVentas.length ? ultimasVentas.map(v=>`<tr><td>${v.numero}</td><td>${esc(v.clienteNombre)}</td><td>${money(v.total)}</td></tr>`).join('') : `<tr><td colspan="3" class="empty">Todavía no hay ventas</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="card">
        <h3 style="font-size:14px; margin-bottom:10px;">Stock bajo mínimo</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Producto</th><th>Stock</th></tr></thead>
          <tbody>${stockBajo.length ? stockBajo.slice(0,8).map(p=>`<tr><td>${esc(p.descripcion)}</td><td>${stockPill(p)}</td></tr>`).join('') : `<tr><td colspan="2" class="empty">Todo en orden</td></tr>`}</tbody>
        </table></div>
      </div>
    </div>
    <style>@media(max-width:860px){.panel-grid{grid-template-columns:1fr !important;}}</style>`;
}

function renderReportes(){
  const stockBajo = productosStockBajo();
  const conteo = {};
  state.ventas.forEach(v => (v.items||[]).forEach(it => {
    const key = it.productoId || it.descripcion;
    if(!conteo[key]) conteo[key] = {descripcion: it.descripcion, cantidad:0, total:0};
    conteo[key].cantidad += Number(it.cantidad)||0;
    conteo[key].total += (Number(it.cantidad)||0) * (Number(it.precioUnitario)||0) * (1-(Number(it.descuentoPct)||0)/100);
  }));
  const topProductos = Object.values(conteo).sort((a,b)=>b.cantidad-a.cantidad).slice(0,10);

  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Reportes</h1></div>
    <div class="grid-cards">
      <div class="stat"><div class="label">Ventas de hoy</div><div class="value">${money(ventasHoy().reduce((s,v)=>s+v.total,0))}</div></div>
      <div class="stat"><div class="label">Ventas del mes</div><div class="value">${money(ventasDelMes().reduce((s,v)=>s+v.total,0))}</div></div>
      <div class="stat"><div class="label">Compras del mes</div><div class="value">${money(comprasDelMes().reduce((s,c)=>s+c.total,0))}</div></div>
    </div>
    <div class="card" style="margin-bottom:18px;">
      <h3 style="font-size:14px; margin-bottom:10px;">Productos más vendidos</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Cantidad vendida</th><th>Total facturado</th></tr></thead>
        <tbody>${topProductos.length ? topProductos.map(p=>`<tr><td>${esc(p.descripcion)}</td><td>${p.cantidad}</td><td>${money(p.total)}</td></tr>`).join('') : `<tr><td colspan="3" class="empty">Sin ventas todavía</td></tr>`}</tbody>
      </table></div>
    </div>
    <div class="card">
      <h3 style="font-size:14px; margin-bottom:10px;">Stock bajo mínimo (${stockBajo.length})</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Código</th><th>Producto</th><th>Stock</th><th>Mínimo</th></tr></thead>
        <tbody>${stockBajo.length ? stockBajo.map(p=>`<tr><td>${esc(p.codigoInterno)}</td><td>${esc(p.descripcion)}</td><td>${stockPill(p)}</td><td>${p.stockMinimo}</td></tr>`).join('') : `<tr><td colspan="4" class="empty">Todo en orden</td></tr>`}</tbody>
      </table></div>
    </div>`;
}
function comprasDelMes(){
  const now = new Date(); const ym = now.toISOString().slice(0,7);
  return state.compras.filter(c => (c.fecha||'').slice(0,7) === ym);
}
