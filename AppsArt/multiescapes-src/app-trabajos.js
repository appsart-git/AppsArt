'use strict';
/* ===================== TRABAJOS (historial) ===================== */
// Cada trabajo guardado desde "Nuevo informe" (app-informe.js) queda acá, atado a un cliente y
// un vehículo, buscable/filtrable por nombre de cliente, patente o rango de fechas.

function trabajosFiltrados(){
  const q = (state.filtroTrabajos.query||'').toLowerCase().trim();
  const desde = state.filtroTrabajos.desde;
  const hasta = state.filtroTrabajos.hasta;
  let list = state.trabajos.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(q){
    list = list.filter(t => {
      const c = state.clientes.find(x=>x.id===t.clienteId);
      const v = state.vehiculos.find(x=>x.id===t.vehiculoId);
      return [c&&c.nombre, v&&v.patente, v&&v.marca, v&&v.modelo].some(val => (val||'').toLowerCase().includes(q));
    });
  }
  if(desde) list = list.filter(t => (t.fecha||'') >= desde);
  if(hasta) list = list.filter(t => (t.fecha||'') <= hasta);
  return list;
}

function renderTrabajos(){
  const list = trabajosFiltrados();
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Trabajos</h1></div>
    <div class="filters-row">
      <div class="searchbar"><span class="ico">🔎</span><input placeholder="Cliente, patente o marca…" data-input="filtro_trabajos_query" value="${esc(state.filtroTrabajos.query)}"></div>
      <div class="field"><label>Desde</label><input type="date" data-change="filtro_trabajos_desde" value="${esc(state.filtroTrabajos.desde)}"></div>
      <div class="field"><label>Hasta</label><input type="date" data-change="filtro_trabajos_hasta" value="${esc(state.filtroTrabajos.hasta)}"></div>
    </div>
    <div class="card-list">
      ${list.length ? list.map(t => {
        const c = state.clientes.find(x=>x.id===t.clienteId);
        const v = state.vehiculos.find(x=>x.id===t.vehiculoId);
        return `<div class="row-card" data-action="verTrabajo" data-id="${t.id}" role="button" tabindex="0">
          <div class="top">
            <b>${esc(c ? c.nombre : 'Cliente eliminado')}</b>
            <span class="pill pill-red">${money(t.total)}</span>
          </div>
          <div class="meta">${esc(vehiculoLabel(v))} · ${fmtDate(t.fecha||t.createdAt)}</div>
        </div>`;
      }).join('') : `<p class="empty">No hay trabajos que coincidan con la búsqueda.</p>`}
    </div>`;
}

function trabajoDetailHtml(id){
  const t = state.trabajos.find(x=>x.id===id);
  if(!t) return '';
  const c = state.clientes.find(x=>x.id===t.clienteId);
  const v = state.vehiculos.find(x=>x.id===t.vehiculoId);
  const totalRepuestos = (t.repuestos||[]).reduce((s,r)=>s+(r.costo||0),0);
  return `
    <div class="modal-head"><h2>Trabajo — ${fmtDate(t.fecha||t.createdAt)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="row2" style="margin-bottom:14px;">
      <div><span class="muted small">Cliente</span><div><b>${esc(c ? c.nombre : '—')}</b></div></div>
      <div><span class="muted small">Vehículo</span><div><b>${esc(vehiculoLabel(v))}</b></div></div>
    </div>
    <h3 style="font-size:13.5px;">Trabajos realizados</h3>
    <ul style="margin:0 0 14px; padding-left:18px; font-size:13.5px;">
      ${(t.trabajosRealizados||[]).filter(x=>x&&x.trim()).map(x=>`<li>${esc(x)}</li>`).join('') || '<li class="muted">Sin detalle.</li>'}
    </ul>
    <h3 style="font-size:13.5px;">Repuestos</h3>
    <div class="table-wrap" style="margin-bottom:14px;">
      <table><thead><tr><th>Repuesto</th><th>Marca</th><th style="text-align:right;">Costo</th></tr></thead>
        <tbody>${(t.repuestos||[]).filter(r=>r.nombre).map(r=>`<tr><td>${esc(r.nombre)}</td><td class="muted">${esc(r.marca||'—')}</td><td style="text-align:right;">${money(r.costo)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Sin repuestos.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="row2" style="margin-bottom:14px;">
      <div><span class="muted small">Repuestos</span><div>${money(totalRepuestos)}</div></div>
      <div><span class="muted small">Mano de obra</span><div>${money(t.manoObra)}</div></div>
    </div>
    <div style="font-size:16px; font-weight:700; margin-bottom:14px;">Total: ${money(t.total)}</div>
    ${(t.observaciones||[]).filter(o=>o&&o.trim()).length ? `
      <h3 style="font-size:13.5px;">Observaciones</h3>
      <ul style="margin:0 0 14px; padding-left:18px; font-size:13.5px;">${t.observaciones.filter(o=>o&&o.trim()).map(o=>`<li>${esc(o)}</li>`).join('')}</ul>
    ` : ''}
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cerrar</button>
      <button class="btn btn-primary" data-action="cargarTrabajoEnInforme" data-id="${t.id}">Volver a generar informe</button>
    </div>`;
}

Object.assign(actions, {
  verTrabajo(el){ openModal(trabajoDetailHtml(el.dataset.id), {wide:true}); }
});

inputActions.filtro_trabajos_query = (el) => { state.filtroTrabajos.query = el.value; renderTrabajos(); };
inputActions.filtro_trabajos_desde = (el) => { state.filtroTrabajos.desde = el.value; renderTrabajos(); };
inputActions.filtro_trabajos_hasta = (el) => { state.filtroTrabajos.hasta = el.value; renderTrabajos(); };
