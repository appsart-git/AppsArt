'use strict';
/* ===================== SEGUIMIENTO: estado del auto en el taller ===================== */
// Resuelve los llamados de "¿cómo va mi auto?": cada auto que entra al taller se registra acá con
// un estado (Recibido → Diagnóstico → Esperando repuesto → Listo) que el mostrador va actualizando.
// Cuando queda "Listo", un clic lo manda a "Nuevo informe" para generar el PDF final. Es un flujo
// separado del historial de trabajos terminados (eso vive en Trabajos): acá se sigue un auto que
// todavía está en el taller, no uno que ya se facturó.

const ESTADOS_ORDEN = [
  {id:'recibido', label:'Recibido', ico:'🚗'},
  {id:'diagnostico', label:'Diagnóstico', ico:'🔍'},
  {id:'esperando_repuesto', label:'Esperando repuesto', ico:'📦'},
  {id:'listo', label:'Listo', ico:'✅'}
];
function estadoIndex(id){ return Math.max(0, ESTADOS_ORDEN.findIndex(e=>e.id===id)); }
function estadoLabel(id){ const e = ESTADOS_ORDEN.find(e=>e.id===id); return e ? e.label : id; }

function ordenesActivas(){
  return state.ordenes.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}

function estadoTrackHtml(estadoActual, small){
  const idx = estadoIndex(estadoActual);
  return `<div class="estado-track">${ESTADOS_ORDEN.map((e,i) => `
    <div class="estado-step ${i<idx?'done':''} ${i===idx?'current':''}">
      <div class="dot">${i<idx?'✓':(small?'':i+1)}</div>
      <div class="lbl">${esc(e.label)}</div>
    </div>`).join('')}</div>`;
}

function renderSeguimiento(){
  const list = ordenesActivas();
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Estado de los autos</h1>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <p class="lead" style="margin:0; flex:1 1 100%;">Cada auto que entra al taller se sigue acá — así el cliente deja de llamar para preguntar cómo va.</p>
        <button class="btn btn-primary" data-action="nuevaOrden">+ Registrar auto</button>
      </div>
    </div>
    ${list.length ? list.map(ordenCardHtml).join('') : `<p class="empty">No hay autos en el taller ahora mismo. Registrá uno con "+ Registrar auto".</p>`}
  `;
}

function ordenCardHtml(o){
  const c = state.clientes.find(x=>x.id===o.clienteId);
  const v = state.vehiculos.find(x=>x.id===o.vehiculoId);
  const idx = estadoIndex(o.estado);
  const next = ESTADOS_ORDEN[idx+1];
  const msgEstado = c ? fillTemplate(state.negocio.mensajeEstado, {
    nombre: (c.nombre||'').split(' ')[0], vehiculo: v?vehiculoLabel(v):'tu vehículo',
    taller: state.negocio.nombre, estado: estadoLabel(o.estado)
  }) : '';
  const ultimoAviso = state.contactos.filter(x=>x.clienteId===o.clienteId && x.tipo==='estado' && x.ordenId===o.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
  return `
    <div class="orden-card">
      <div class="top">
        <div>
          <b>${esc(c ? c.nombre : 'Cliente')}</b>
          <div class="muted small">${v ? esc(vehiculoLabel(v)) : ''} · Ingresó ${fmtDate(o.fechaIngreso)}</div>
        </div>
        <span class="pill ${o.estado==='listo'?'pill-ok':'pill-dark'}">${esc(estadoLabel(o.estado))}</span>
      </div>
      ${estadoTrackHtml(o.estado)}
      ${o.nota ? `<p class="small muted" style="margin:8px 0 0;">${esc(o.nota)}</p>` : ''}
      ${ultimoAviso ? `<p class="small muted" style="margin:8px 0 0;">Último aviso enviado: ${fmtDate(ultimoAviso.fecha)} (${esc(estadoLabel(ultimoAviso.estado||''))})</p>` : ''}
      <div class="orden-actions">
        ${next ? `<button class="btn btn-sm btn-primary" data-action="avanzarOrden" data-id="${o.id}">Pasar a "${esc(next.label)}"</button>` : ''}
        <button class="btn btn-sm btn-ghost" data-action="vistaClienteOrden" data-id="${o.id}">👁️ Vista del cliente</button>
        ${c && c.telefono
          ? `<a class="btn btn-sm btn-wa" href="${waLink(c.telefono, msgEstado)}" target="_blank" rel="noopener" data-action="avisarEstadoOrden" data-id="${o.id}">💬 Avisar por WhatsApp</a>`
          : `<span class="small muted" style="align-self:center;">Sin teléfono para avisar</span>`}
        ${o.estado==='listo' ? `<button class="btn btn-sm btn-share" data-action="generarInformeDesdeOrden" data-id="${o.id}">🧾 Generar informe</button>` : ''}
        <button class="btn-danger" data-action="eliminarOrden" data-id="${o.id}">Quitar</button>
      </div>
    </div>`;
}

/* ---------- vista del cliente (simula qué vería el dueño del auto desde su celular) ---------- */
function vistaClienteHtml(o){
  const c = state.clientes.find(x=>x.id===o.clienteId);
  const v = state.vehiculos.find(x=>x.id===o.vehiculoId);
  return `
    <div class="modal-head"><h2>Vista del cliente</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <p class="small muted" style="margin-top:-6px;">Así de simple es lo que ve tu cliente cuando le mandás el link de estado — sin llamarte para preguntar.</p>
    <div class="client-view">
      <img class="cv-logo" src="./logo-tutaller.png" alt="${esc(state.negocio.nombre)}">
      <div class="small" style="color:rgba(255,255,255,.55); text-transform:uppercase; letter-spacing:.08em;">Estado de tu vehículo</div>
      <h3>${v ? esc(vehiculoLabel(v)) : 'Tu vehículo'}</h3>
      <p>Hola ${esc(c?(c.nombre||'').split(' ')[0]:'')}, este es el estado actual</p>
      ${estadoTrackHtml(o.estado, true)}
      <p style="margin-top:18px;">${o.estado==='listo' ? '✅ Ya podés pasar a retirarlo.' : 'Te avisamos apenas cambie de etapa.'}</p>
    </div>`;
}

/* ---------- registrar auto (recepción rápida) ---------- */
function blankOrdenDraft(){ return {clienteId:null, vehiculoId:null, nombre:'', telefono:'', patente:'', marca:'', modelo:'', nota:''}; }
if(!state._ordenDraft) state._ordenDraft = blankOrdenDraft();

function nuevaOrdenHtml(){
  const d = state._ordenDraft;
  const cliente = d.clienteId ? state.clientes.find(x=>x.id===d.clienteId) : null;
  const vehiculosCliente = d.clienteId ? vehiculosDeCliente(d.clienteId) : [];
  return `
    <div class="modal-head"><h2>Registrar auto en el taller</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    ${cliente ? `
      <div class="pill pill-ok" style="margin-bottom:12px; display:inline-flex; gap:8px;">${esc(cliente.nombre)} <button class="btn-danger" style="padding:1px 8px; font-size:11px;" data-action="quitarClienteOrden">Quitar</button></div>
      ${vehiculosCliente.length ? `
        <div class="field"><label>Vehículo</label>
          <select data-change="orden_vehiculo_select">
            <option value="">＋ Vehículo nuevo</option>
            ${vehiculosCliente.map(v=>`<option value="${v.id}"${d.vehiculoId===v.id?' selected':''}>${esc(vehiculoLabel(v))}</option>`).join('')}
          </select>
        </div>` : ''}
    ` : `<button class="btn btn-ghost btn-block" style="margin-bottom:12px;" data-action="buscarClienteOrden">🔎 Buscar cliente existente</button>`}

    ${(!cliente) ? `<div class="field"><label>Nombre del cliente</label><input id="of_nombre" data-orden-field="nombre" value="${esc(d.nombre)}" placeholder="Nombre y apellido"></div>
      <div class="field"><label>Teléfono (WhatsApp)</label><input id="of_telefono" data-orden-field="telefono" value="${esc(d.telefono)}" placeholder="Ej: 2914123456"></div>` : ''}

    ${(!d.vehiculoId) ? `
      <div class="row2">
        <div class="field"><label>Patente</label><input id="of_patente" data-orden-field="patente" value="${esc(d.patente)}" placeholder="AD 361 KQ" style="text-transform:uppercase;"></div>
        <div class="field"><label>Marca</label><input id="of_marca" data-orden-field="marca" value="${esc(d.marca)}"></div>
      </div>
      <div class="field"><label>Modelo</label><input id="of_modelo" data-orden-field="modelo" value="${esc(d.modelo)}"></div>` : ''}

    <div class="field"><label>Observación (opcional)</label><input id="of_nota" data-orden-field="nota" value="${esc(d.nota)}" placeholder="Ej: hace ruido al frenar"></div>

    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarOrden">Registrar</button>
    </div>`;
}

Object.assign(actions, {
  nuevaOrden(){ state._ordenDraft = blankOrdenDraft(); openModal(nuevaOrdenHtml()); },
  buscarClienteOrden(){ state._buscadorClienteQuery=''; state._buscadorClienteTarget='elegirClienteOrden'; openModal(buscadorClienteHtml()); },
  elegirClienteOrden(el){
    const c = state.clientes.find(x=>x.id===el.dataset.id);
    if(!c) return;
    state._ordenDraft.clienteId = c.id;
    state._ordenDraft.nombre = c.nombre||'';
    state._ordenDraft.telefono = c.telefono||'';
    const vs = vehiculosDeCliente(c.id);
    state._ordenDraft.vehiculoId = vs.length===1 ? vs[0].id : null;
    closeModal();
    openModal(nuevaOrdenHtml());
  },
  quitarClienteOrden(){ state._ordenDraft.clienteId = null; state._ordenDraft.vehiculoId = null; openModal(nuevaOrdenHtml()); },
  guardarOrden(){
    const d = state._ordenDraft;
    markSaving();
    (async () => {
      try{
        let clienteId = d.clienteId;
        if(!clienteId){
          const nombre = (document.getElementById('of_nombre')||{}).value?.trim();
          if(!nombre){ doneSaving(); toast('Falta el nombre del cliente.'); return; }
          clienteId = await collectionRef('clientes').add({
            nombre, telefono:(document.getElementById('of_telefono')||{}).value?.trim()||'', direccion:'', createdAt:Date.now()
          });
        }
        let vehiculoId = d.vehiculoId;
        if(!vehiculoId){
          const patenteEl = document.getElementById('of_patente');
          vehiculoId = await collectionRef('vehiculos').add({
            clienteId,
            patente: patenteEl ? patenteEl.value.trim().toUpperCase() : '',
            marca: (document.getElementById('of_marca')||{}).value?.trim()||'',
            modelo: (document.getElementById('of_modelo')||{}).value?.trim()||'',
            anio:'', createdAt:Date.now()
          });
        }
        await collectionRef('ordenes').add({
          clienteId, vehiculoId, estado:'recibido',
          fechaIngreso: todayISO(),
          nota:(document.getElementById('of_nota')||{}).value?.trim()||'',
          createdAt: Date.now()
        });
        doneSaving();
        closeModal();
        toast('Auto registrado en el taller.');
      }catch(e){ saveError(e); }
    })();
  },
  avanzarOrden(el){
    const o = state.ordenes.find(x=>x.id===el.dataset.id);
    if(!o) return;
    const next = ESTADOS_ORDEN[estadoIndex(o.estado)+1];
    if(!next) return;
    markSaving();
    collectionRef('ordenes').update(o.id, {estado: next.id}).then(()=>{ doneSaving(); toast(`Estado actualizado: ${next.label}`); }).catch(saveError);
  },
  vistaClienteOrden(el){
    const o = state.ordenes.find(x=>x.id===el.dataset.id);
    if(!o) return;
    openModal(vistaClienteHtml(o));
  },
  avisarEstadoOrden(el){
    const o = state.ordenes.find(x=>x.id===el.dataset.id);
    if(!o) return;
    collectionRef('contactos').add({
      clienteId: o.clienteId, vehiculoId: o.vehiculoId, ordenId: o.id,
      tipo:'estado', estado: o.estado, fecha: todayISO(), createdAt: Date.now()
    });
    toast('Aviso de estado registrado.');
  },
  eliminarOrden(el){
    confirmDialog('¿Quitar este auto del seguimiento?', () => {
      markSaving();
      collectionRef('ordenes').remove(el.dataset.id).then(()=>{ doneSaving(); toast('Quitado del seguimiento.'); }).catch(saveError);
    });
  },
  generarInformeDesdeOrden(el){
    const o = state.ordenes.find(x=>x.id===el.dataset.id);
    if(!o) return;
    cargarClienteVehiculoComoInforme(o.clienteId, o.vehiculoId);
    collectionRef('ordenes').remove(o.id);
    goSection('informe');
    toast('Completá el informe con lo que se hizo — el auto ya salió del seguimiento.');
  }
});

inputActions.orden_vehiculo_select = (el) => { state._ordenDraft.vehiculoId = el.value || null; openModal(nuevaOrdenHtml()); };
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-orden-field]');
  if(!el) return;
  state._ordenDraft[el.dataset.ordenField] = el.value;
});
