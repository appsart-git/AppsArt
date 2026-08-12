'use strict';
/* ===================== PANEL (dashboard) + REPORTES ===================== */

function ventasHoy(){ const t = todayISO(); return state.ventas.filter(v=>!v.anulada && v.fecha===t); }
function ventasDelMes(){
  const now = new Date(); const ym = now.toISOString().slice(0,7);
  return state.ventas.filter(v => !v.anulada && (v.fecha||'').slice(0,7) === ym);
}
function comprasDelMes(){
  const now = new Date(); const ym = now.toISOString().slice(0,7);
  return state.compras.filter(c => !c.anulada && (c.fecha||'').slice(0,7) === ym);
}
function totalCobrar(){ return state.clientes.reduce((s,c)=>s+Math.max(0,Number(c.saldo)||0),0); }
function totalPagar(){ return state.proveedores.reduce((s,p)=>s+Math.max(0,Number(p.saldo)||0),0); }
function productosStockBajo(){ return state.productos.filter(p => p.activo!==false && (Number(p.stock)||0) <= (Number(p.stockMinimo)||0)); }

// Ganancia de una venta usando el costo guardado en cada línea al momento de vender. Las ventas
// cargadas antes de que empezáramos a guardar ese dato no lo tienen (it.costoUnitario == null):
// para esas se usa el costo ACTUAL del producto como mejor estimación posible, y se marca
// estimada:true para que el reporte lo aclare (ese número puede no ser exacto históricamente).
function gananciaVenta(v){
  let ganancia = 0, estimada = false;
  (v.items||[]).forEach(it => {
    let costo;
    if(it.costoUnitario == null){
      const p = it.productoId ? findProducto(it.productoId) : null;
      costo = p ? Number(p.costoUltimo)||0 : 0;
      estimada = true;
    } else {
      costo = Number(it.costoUnitario)||0;
    }
    const netoItem = Number(it.cantidad) * Number(it.precioUnitario) * (1-(Number(it.descuentoPct)||0)/100);
    ganancia += netoItem - Number(it.cantidad)*costo;
  });
  return {ganancia, estimada};
}

function agruparPorDia(list){
  const map = {};
  list.forEach(x => {
    const f = x.fecha || '—';
    if(!map[f]) map[f] = {fecha:f, cantidad:0, total:0};
    map[f].cantidad += 1;
    map[f].total += Number(x.total)||0;
  });
  return Object.values(map).sort((a,b)=>b.fecha.localeCompare(a.fecha));
}

function renderPanel(){
  const vHoy = ventasHoy(), vMes = ventasDelMes();
  const stockBajo = productosStockBajo();
  const ultimasVentas = state.ventas.filter(v=>!v.anulada).slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
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
      <div class="stat"><div class="label">IVA del mes (21%)</div><div class="value">${money(vMes.reduce((s,v)=>s+v.total,0) * 0.21)}</div></div>
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

/* ===================== REPORTES ===================== */

const REPORTES_TABS = [
  {id:'resumen', label:'Resumen'}, {id:'ventas', label:'Ventas'}, {id:'compras', label:'Compras'},
  {id:'clientes', label:'Por cliente'}, {id:'ganancias', label:'Ganancias'}
];

function renderReportes(){
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Reportes</h1></div>
    <div class="tabs">${REPORTES_TABS.map(t=>`<div class="tab ${state.reportesTab===t.id?'active':''}" data-action="reportesTab" data-tab="${t.id}">${t.label}</div>`).join('')}</div>
    <div id="reportesTabBody"></div>`;
  const renderers = {
    resumen: renderReporteResumen, ventas: renderReporteVentas, compras: renderReporteCompras,
    clientes: renderReporteClientes, ganancias: renderReporteGanancias
  };
  (renderers[state.reportesTab] || renderReporteResumen)();
}

function rangoSelectHtml(id){
  return `<select id="${id}" data-change="reporteRango">${RANGO_OPCIONES.map(r=>`<option value="${r.id}" ${state.reporteRango===r.id?'selected':''}>${r.label}</option>`).join('')}</select>`;
}

function renderReporteResumen(){
  const stockBajo = productosStockBajo();
  const conteo = {};
  state.ventas.filter(v=>!v.anulada).forEach(v => (v.items||[]).forEach(it => {
    const key = it.productoId || it.descripcion;
    if(!conteo[key]) conteo[key] = {descripcion: it.descripcion, cantidad:0, total:0};
    conteo[key].cantidad += Number(it.cantidad)||0;
    conteo[key].total += (Number(it.cantidad)||0) * (Number(it.precioUnitario)||0) * (1-(Number(it.descuentoPct)||0)/100);
  }));
  const topProductos = Object.values(conteo).sort((a,b)=>b.cantidad-a.cantidad).slice(0,10);

  document.getElementById('reportesTabBody').innerHTML = `
    <div class="grid-cards">
      <div class="stat"><div class="label">Ventas de hoy</div><div class="value">${money(ventasHoy().reduce((s,v)=>s+v.total,0))}</div></div>
      <div class="stat"><div class="label">Ventas del mes</div><div class="value">${money(ventasDelMes().reduce((s,v)=>s+v.total,0))}</div></div>
      <div class="stat"><div class="label">IVA del mes (21%)</div><div class="value">${money(ventasDelMes().reduce((s,v)=>s+v.total,0) * 0.21)}</div></div>
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

function renderReporteVentas(){
  const list = state.ventas.filter(v=>!v.anulada && fechaEnRango(v.fecha, state.reporteRango));
  const porDia = agruparPorDia(list);
  const total = list.reduce((s,v)=>s+v.total,0);
  document.getElementById('reportesTabBody').innerHTML = `
    <div class="section-head">
      ${rangoSelectHtml('rv_rango')}
      <button class="btn" data-action="reporteVentasExcel">⬇ Descargar Excel</button>
    </div>
    <div class="stat" style="max-width:260px; margin-bottom:16px;"><div class="label">Total ventas del período</div><div class="value">${money(total)}</div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Cantidad de ventas</th><th>Total</th></tr></thead>
        <tbody>${porDia.length ? porDia.map(d=>`<tr><td>${esc(d.fecha)}</td><td>${d.cantidad}</td><td>${money(d.total)}</td></tr>`).join('') : `<tr><td colspan="3" class="empty">Sin ventas en este período.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function renderReporteCompras(){
  const list = state.compras.filter(c=>!c.anulada && fechaEnRango(c.fecha, state.reporteRango));
  const porDia = agruparPorDia(list);
  const total = list.reduce((s,c)=>s+c.total,0);
  document.getElementById('reportesTabBody').innerHTML = `
    <div class="section-head">
      ${rangoSelectHtml('rc_rango')}
      <button class="btn" data-action="reporteComprasExcel">⬇ Descargar Excel</button>
    </div>
    <div class="stat" style="max-width:260px; margin-bottom:16px;"><div class="label">Total compras del período</div><div class="value">${money(total)}</div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Cantidad de compras</th><th>Total</th></tr></thead>
        <tbody>${porDia.length ? porDia.map(d=>`<tr><td>${esc(d.fecha)}</td><td>${d.cantidad}</td><td>${money(d.total)}</td></tr>`).join('') : `<tr><td colspan="3" class="empty">Sin compras en este período.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function reporteClientesFilas(){
  const porCliente = {};
  state.ventas.filter(v=>!v.anulada && fechaEnRango(v.fecha, state.reporteRango)).forEach(v => {
    const key = v.clienteId || '__cf__';
    if(!porCliente[key]) porCliente[key] = {nombre: v.clienteNombre||'Consumidor final', clienteId:v.clienteId||null, cantidad:0, total:0};
    porCliente[key].cantidad += 1;
    porCliente[key].total += v.total;
  });
  return Object.values(porCliente).sort((a,b)=>b.total-a.total);
}

function renderReporteClientes(){
  const filas = reporteClientesFilas();
  document.getElementById('reportesTabBody').innerHTML = `
    <div class="section-head">
      ${rangoSelectHtml('rcl_rango')}
      <button class="btn" data-action="reporteClientesExcel">⬇ Descargar Excel</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Cliente</th><th>Cantidad de ventas</th><th>Total facturado</th><th>Saldo actual</th></tr></thead>
        <tbody>${filas.length ? filas.map(f=>{
          const cliente = f.clienteId ? findCliente(f.clienteId) : null;
          return `<tr><td>${esc(f.nombre)}</td><td>${f.cantidad}</td><td>${money(f.total)}</td><td>${cliente ? money(cliente.saldo) : '—'}</td></tr>`;
        }).join('') : `<tr><td colspan="4" class="empty">Sin ventas en este período.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function reporteGananciasFilas(){
  const porMes = {};
  state.ventas.filter(v=>!v.anulada).forEach(v => {
    const mes = (v.fecha||'').slice(0,7);
    if(!mes) return;
    if(!porMes[mes]) porMes[mes] = {mes, cantidad:0, ventas:0, ganancia:0, estimada:false};
    const {ganancia, estimada} = gananciaVenta(v);
    porMes[mes].cantidad += 1;
    porMes[mes].ventas += v.total;
    porMes[mes].ganancia += ganancia;
    if(estimada) porMes[mes].estimada = true;
  });
  return Object.values(porMes).sort((a,b)=>b.mes.localeCompare(a.mes));
}

function renderReporteGanancias(){
  const filas = reporteGananciasFilas();
  document.getElementById('reportesTabBody').innerHTML = `
    <p class="muted" style="font-size:12.5px; margin-top:0;">La ganancia usa el costo guardado en cada venta al momento de venderla. Los meses marcados con * incluyen ventas cargadas antes de guardar ese dato — para esas se estima con el costo actual del producto, así que ese número puede no ser exacto.</p>
    <div class="table-wrap" style="margin-bottom:14px;">
      <table>
        <thead><tr><th>Mes</th><th>Ventas</th><th>Facturado</th><th>Ganancia</th><th>Margen</th></tr></thead>
        <tbody>${filas.length ? filas.map(f=>`
          <tr>
            <td>${esc(f.mes)}${f.estimada?' *':''}</td>
            <td>${f.cantidad}</td>
            <td>${money(f.ventas)}</td>
            <td style="color:${f.ganancia<0?'var(--red)':'inherit'};">${money(f.ganancia)}</td>
            <td>${f.ventas>0 ? (f.ganancia/f.ventas*100).toFixed(1)+'%' : '—'}</td>
          </tr>`).join('') : `<tr><td colspan="5" class="empty">Sin ventas todavía.</td></tr>`}</tbody>
      </table>
    </div>
    <button class="btn" data-action="reporteGananciasExcel">⬇ Descargar Excel</button>`;
}

Object.assign(actions, {
  reportesTab(el){ state.reportesTab = el.dataset.tab; renderReportes(); },
  reporteVentasExcel(el){
    // El Excel exporta el detalle por venta (no el resumen por día de la pantalla) con columna
    // Cliente, para que se pueda filtrar/agrupar por cliente directamente en la planilla.
    const list = state.ventas.filter(v => fechaEnRango(v.fecha, state.reporteRango)).sort((a,b)=>b.createdAt-a.createdAt);
    descargarTablaExcel(el, 'reporte-ventas-' + todayISO() + '.xlsx', 'Ventas',
      ['N°','Fecha','Cliente','Total','Forma de pago','Estado'],
      list.map(v => [v.numero, v.fecha, v.clienteNombre, v.total, v.formaPago, v.anulada?'Anulada':'Confirmada']));
  },
  reporteComprasExcel(el){
    const list = state.compras.filter(c => fechaEnRango(c.fecha, state.reporteRango)).sort((a,b)=>b.createdAt-a.createdAt);
    descargarTablaExcel(el, 'reporte-compras-' + todayISO() + '.xlsx', 'Compras',
      ['Fecha','Proveedor','N° factura','Total','Forma de pago','Estado'],
      list.map(c => [c.fecha, c.proveedorNombre, c.nroFacturaProveedor||'', c.total, c.formaPago, c.anulada?'Anulada':'Confirmada']));
  },
  reporteClientesExcel(el){
    const filas = reporteClientesFilas();
    descargarTablaExcel(el, 'reporte-por-cliente-' + todayISO() + '.xlsx', 'Por cliente',
      ['Cliente','Cantidad de ventas','Total facturado','Saldo actual'],
      filas.map(f => [f.nombre, f.cantidad, f.total, f.clienteId ? (Number(findCliente(f.clienteId).saldo)||0) : '']));
  },
  reporteGananciasExcel(el){
    const filas = reporteGananciasFilas();
    descargarTablaExcel(el, 'reporte-ganancias-' + todayISO() + '.xlsx', 'Ganancias',
      ['Mes','Cantidad de ventas','Facturado','Ganancia','Margen %','Incluye estimado'],
      filas.map(f => [f.mes, f.cantidad, f.ventas, Math.round(f.ganancia*100)/100, f.ventas>0?Math.round(f.ganancia/f.ventas*1000)/10:0, f.estimada?'Sí':'No']));
  }
});

inputActions.reporteRango = (el) => { state.reporteRango = el.value; renderReportes(); };
