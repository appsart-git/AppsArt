'use strict';
/* ===================== CLIENTES + VEHÍCULOS ===================== */
// Un cliente puede tener uno o más vehículos (patente/marca/modelo/año). Los trabajos quedan
// atados a un clienteId + vehiculoId, así se puede buscar el historial por cliente o por patente
// (un mismo auto puede volver con otro dueño con el tiempo).

function vehiculosDeCliente(clienteId){
  return state.vehiculos.filter(v => v.clienteId === clienteId).sort((a,b)=>(a.patente||'').localeCompare(b.patente||''));
}
function trabajosDeCliente(clienteId){
  return state.trabajos.filter(t => t.clienteId === clienteId).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}
function vehiculoLabel(v){
  if(!v) return '—';
  return `${v.patente ? v.patente.toUpperCase()+' — ' : ''}${v.marca||''} ${v.modelo||''}`.trim();
}

function clientesFiltrados(){
  const q = (state.filtro.clientes||'').toLowerCase().trim();
  let list = state.clientes.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  if(!q) return list;
  const patenteMatchIds = new Set(
    state.vehiculos.filter(v => (v.patente||'').toLowerCase().includes(q)).map(v => v.clienteId)
  );
  return list.filter(c =>
    [c.nombre, c.telefono, c.direccion].some(v => (v||'').toLowerCase().includes(q)) ||
    patenteMatchIds.has(c.id)
  );
}

function renderClientes(){
  const list = clientesFiltrados();
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Clientes</h1>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <div class="searchbar"><span class="ico">🔎</span><input placeholder="Buscar por nombre, teléfono o patente…" data-input="filtro_clientes" value="${esc(state.filtro.clientes)}"></div>
        <button class="btn btn-primary" data-action="nuevoCliente">+ Nuevo cliente</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>Vehículos</th><th>Trabajos</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(c => {
            const vs = vehiculosDeCliente(c.id);
            const tCount = trabajosDeCliente(c.id).length;
            return `
            <tr style="cursor:pointer;" data-action="verCliente" data-id="${c.id}" role="button" tabindex="0">
              <td><b>${esc(c.nombre)}</b></td>
              <td class="muted">${esc(c.telefono||'—')}</td>
              <td class="muted">${vs.length ? esc(vs.map(v=>v.patente||v.marca).join(', ')) : '—'}</td>
              <td class="muted">${tCount}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm btn-icon" data-action="editarCliente" data-id="${c.id}" title="Editar">✏️</button>
                <button class="btn btn-sm btn-icon" data-action="eliminarCliente" data-id="${c.id}" title="Eliminar">🗑️</button>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="5" class="empty">Todavía no hay clientes cargados.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function clienteFormHtml(c){
  c = c || {};
  return `
    <div class="modal-head"><h2>${c.id?'Editar cliente':'Nuevo cliente'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <input type="hidden" id="cf_id" value="${c.id||''}">
    <div class="field"><label>Nombre</label><input id="cf_nombre" value="${esc(c.nombre||'')}" placeholder="Nombre y apellido"></div>
    <div class="row2">
      <div class="field"><label>Teléfono (WhatsApp)</label><input id="cf_telefono" value="${esc(c.telefono||'')}" placeholder="Ej: 2914123456"></div>
      <div class="field"><label>Dirección</label><input id="cf_direccion" value="${esc(c.direccion||'')}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarCliente">Guardar</button>
    </div>`;
}

function vehiculoFormHtml(clienteId, v){
  v = v || {};
  return `
    <div class="modal-head"><h2>${v.id?'Editar vehículo':'Nuevo vehículo'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <input type="hidden" id="vf_id" value="${v.id||''}">
    <input type="hidden" id="vf_clienteId" value="${clienteId}">
    <div class="field"><label>Patente</label><input id="vf_patente" value="${esc(v.patente||'')}" placeholder="AD 361 KQ" style="text-transform:uppercase;"></div>
    <div class="row2">
      <div class="field"><label>Marca</label><input id="vf_marca" value="${esc(v.marca||'')}"></div>
      <div class="field"><label>Modelo</label><input id="vf_modelo" value="${esc(v.modelo||'')}"></div>
    </div>
    <div class="field" style="max-width:140px;"><label>Año</label><input id="vf_anio" type="number" value="${esc(v.anio||'')}" placeholder="2020"></div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarVehiculo">Guardar</button>
    </div>`;
}

function clienteDetailHtml(id){
  const c = state.clientes.find(x=>x.id===id);
  if(!c) return '';
  const vs = vehiculosDeCliente(id);
  const trabajos = trabajosDeCliente(id);
  return `
    <div class="modal-head"><h2>${esc(c.nombre)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="row2">
      <div><span class="muted small">Teléfono</span><div>${esc(c.telefono||'—')}</div></div>
      <div><span class="muted small">Dirección</span><div>${esc(c.direccion||'—')}</div></div>
    </div>
    <div style="margin:16px 0 10px; display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn btn-sm" data-action="editarCliente" data-id="${id}">Editar datos</button>
      <button class="btn-danger" data-action="eliminarCliente" data-id="${id}">Eliminar cliente</button>
    </div>

    <h3 style="font-size:14px; margin-top:18px; display:flex; justify-content:space-between; align-items:center;">
      Vehículos
      <button class="btn btn-sm btn-primary" data-action="nuevoVehiculo" data-cliente="${id}">+ Vehículo</button>
    </h3>
    <div class="table-wrap" style="max-height:200px; overflow-y:auto;">
      <table><thead><tr><th>Patente</th><th>Marca</th><th>Modelo</th><th>Año</th><th></th></tr></thead>
      <tbody>${vs.length ? vs.map(v=>`
        <tr>
          <td><b>${esc((v.patente||'—').toUpperCase())}</b></td>
          <td class="muted">${esc(v.marca||'—')}</td>
          <td class="muted">${esc(v.modelo||'—')}</td>
          <td class="muted">${esc(v.anio||'—')}</td>
          <td style="text-align:right; white-space:nowrap;">
            <button class="btn btn-sm btn-icon" data-action="editarVehiculo" data-id="${v.id}" data-cliente="${id}" title="Editar">✏️</button>
            <button class="btn btn-sm btn-icon" data-action="eliminarVehiculo" data-id="${v.id}" data-cliente="${id}" title="Eliminar">🗑️</button>
          </td>
        </tr>`).join('') : `<tr><td colspan="5" class="empty">Sin vehículos cargados.</td></tr>`}</tbody></table>
    </div>

    <h3 style="font-size:14px; margin-top:18px;">Historial de trabajos</h3>
    <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
      <table><thead><tr><th>Fecha</th><th>Vehículo</th><th>Total</th><th></th></tr></thead>
      <tbody>${trabajos.length ? trabajos.map(t=>{
        const v = state.vehiculos.find(x=>x.id===t.vehiculoId);
        return `<tr style="cursor:pointer;" data-action="verTrabajo" data-id="${t.id}" role="button" tabindex="0">
          <td>${fmtDate(t.fecha||t.createdAt)}</td>
          <td class="muted">${esc(vehiculoLabel(v))}</td>
          <td>${money(t.total)}</td>
          <td style="text-align:right;">›</td>
        </tr>`;
      }).join('') : `<tr><td colspan="4" class="empty">Sin trabajos registrados.</td></tr>`}</tbody></table>
    </div>`;
}

Object.assign(actions, {
  nuevoCliente(){ openModal(clienteFormHtml(null)); },
  editarCliente(el){ openModal(clienteFormHtml(state.clientes.find(x=>x.id===el.dataset.id))); },
  verCliente(el){ openModal(clienteDetailHtml(el.dataset.id), {wide:true}); },
  guardarCliente(){
    const id = document.getElementById('cf_id').value;
    const nombre = document.getElementById('cf_nombre').value.trim();
    if(!nombre){ toast('Falta el nombre.'); return; }
    const data = {
      nombre,
      telefono: document.getElementById('cf_telefono').value.trim(),
      direccion: document.getElementById('cf_direccion').value.trim()
    };
    closeModal(); markSaving();
    if(id){
      collectionRef('clientes').update(id, data).then(doneSaving).catch(saveError);
    } else {
      data.createdAt = Date.now();
      collectionRef('clientes').add(data).then(doneSaving).catch(saveError);
    }
    toast('Cliente guardado.');
  },
  nuevoVehiculo(el){ openModal(vehiculoFormHtml(el.dataset.cliente, null)); },
  editarVehiculo(el){
    openModal(vehiculoFormHtml(el.dataset.cliente, state.vehiculos.find(x=>x.id===el.dataset.id)));
  },
  guardarVehiculo(){
    const id = document.getElementById('vf_id').value;
    const clienteId = document.getElementById('vf_clienteId').value;
    const data = {
      clienteId,
      patente: document.getElementById('vf_patente').value.trim().toUpperCase(),
      marca: document.getElementById('vf_marca').value.trim(),
      modelo: document.getElementById('vf_modelo').value.trim(),
      anio: document.getElementById('vf_anio').value.trim()
    };
    closeModal(); markSaving();
    if(id){
      collectionRef('vehiculos').update(id, data).then(doneSaving).catch(saveError);
    } else {
      data.createdAt = Date.now();
      collectionRef('vehiculos').add(data).then(doneSaving).catch(saveError);
    }
    toast('Vehículo guardado.');
    setTimeout(()=>openModal(clienteDetailHtml(clienteId), {wide:true}), 50);
  },
  eliminarCliente(el){
    const id = el.dataset.id;
    const c = state.clientes.find(x=>x.id===id);
    if(!c) return;
    const vs = vehiculosDeCliente(id);
    const trabajos = trabajosDeCliente(id);
    const partes = [];
    if(vs.length) partes.push(`${vs.length} vehículo${vs.length===1?'':'s'}`);
    if(trabajos.length) partes.push(`${trabajos.length} trabajo${trabajos.length===1?'':'s'}`);
    const advertencia = partes.length ? ` También tiene ${partes.join(' y ')} cargados — se van a eliminar junto con el cliente.` : '';
    confirmDialog(`¿Eliminar a ${c.nombre}?${advertencia} No se puede deshacer.`, () => {
      closeModal(); markSaving();
      Promise.all([
        collectionRef('clientes').remove(id),
        ...vs.map(v=>collectionRef('vehiculos').remove(v.id)),
        ...trabajos.map(t=>collectionRef('trabajos').remove(t.id))
      ]).then(() => { doneSaving(); toast('Cliente eliminado.'); }).catch(saveError);
    });
  },
  eliminarVehiculo(el){
    const id = el.dataset.id;
    const clienteId = el.dataset.cliente;
    const v = state.vehiculos.find(x=>x.id===id);
    if(!v) return;
    const trabajos = state.trabajos.filter(t=>t.vehiculoId===id);
    const advertencia = trabajos.length ? ` Tiene ${trabajos.length} trabajo${trabajos.length===1?'':'s'} cargado${trabajos.length===1?'':'s'} — se van a eliminar junto con el vehículo.` : '';
    confirmDialog(`¿Eliminar el vehículo ${esc(vehiculoLabel(v))}?${advertencia} No se puede deshacer.`, () => {
      markSaving();
      Promise.all([
        collectionRef('vehiculos').remove(id),
        ...trabajos.map(t=>collectionRef('trabajos').remove(t.id))
      ]).then(() => {
        doneSaving(); toast('Vehículo eliminado.');
        setTimeout(()=>openModal(clienteDetailHtml(clienteId), {wide:true}), 50);
      }).catch(saveError);
    });
  }
});

inputActions.filtro_clientes = (el) => { state.filtro.clientes = el.value; renderClientes(); };

/* Buscador de clientes reutilizado desde el informe (app-informe.js) para vincular un trabajo
   a un cliente/vehículo existente sin tener que ir a la sección Clientes. */
function buscadorClienteListHtml(){
  const q = (state._buscadorClienteQuery||'').toLowerCase().trim();
  let list = state.clientes.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  if(q){
    const patenteMatchIds = new Set(state.vehiculos.filter(v=>(v.patente||'').toLowerCase().includes(q)).map(v=>v.clienteId));
    list = list.filter(c => [c.nombre,c.telefono].some(v=>(v||'').toLowerCase().includes(q)) || patenteMatchIds.has(c.id));
  }
  list = list.slice(0, 25);
  return list.length ? list.map(c=>{
    const vs = vehiculosDeCliente(c.id);
    return `<div class="row-card" data-action="elegirClienteInforme" data-id="${c.id}" role="button" tabindex="0">
      <div class="top"><b>${esc(c.nombre)}</b><span class="muted small">${esc(c.telefono||'')}</span></div>
      <div class="meta">${vs.length ? esc(vs.map(vehiculoLabel).join(' · ')) : 'Sin vehículos cargados'}</div>
    </div>`;
  }).join('') : `<p class="empty">Sin resultados. Se va a crear un cliente nuevo con los datos que cargues en el formulario.</p>`;
}
function buscadorClienteHtml(){
  return `
    <div class="modal-head"><h2>Buscar cliente</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="searchbar" style="margin-bottom:12px;"><span class="ico">🔎</span><input id="bc_input" autofocus placeholder="Nombre, teléfono o patente…" data-input="buscadorClienteInput" value="${esc(state._buscadorClienteQuery||'')}"></div>
    <div class="card-list" id="bc_list" style="max-height:340px; overflow-y:auto;">${buscadorClienteListHtml()}</div>`;
}
inputActions.buscadorClienteInput = (el) => {
  state._buscadorClienteQuery = el.value;
  const list = document.getElementById('bc_list');
  if(list) list.innerHTML = buscadorClienteListHtml();
};
