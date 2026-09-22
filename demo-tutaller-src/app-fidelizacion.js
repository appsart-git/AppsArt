'use strict';
/* ===================== RECOMPRA: recordatorios de service + promoción mensual ===================== */
// Este es el núcleo de la oferta: "que tus clientes vuelvan solos". No hay backend/cron real acá
// (needs Twilio/servidor, fuera del alcance de una demo self-hosted en localStorage) — lo que sí
// hace la app es calcular sola quién tiene el próximo service vencido o por vencer a partir del
// último trabajo guardado, y arma en un clic el mensaje de WhatsApp (wa.me) para que el taller lo
// mande. El envío lo dispara una persona, pero el trabajo de "quién y cuándo contactar" ya está hecho.

function ultimoTrabajoDeVehiculo(vehiculoId){
  const list = state.trabajos.filter(t => t.vehiculoId === vehiculoId).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  return list[0] || null;
}
function proximoServicioVehiculo(vehiculoId){
  const t = ultimoTrabajoDeVehiculo(vehiculoId);
  if(!t || !t.fecha) return null;
  const fecha = addMonths(t.fecha, state.negocio.intervaloServicioMeses || 6);
  const dias = diffDays(fecha);
  let estado = 'alDia';
  if(dias < 0) estado = 'vencido';
  else if(dias <= 30) estado = 'porVencer';
  return {fecha, dias, estado, ultimaFecha: t.fecha};
}
function proximoServicioCliente(clienteId){
  const vs = vehiculosDeCliente(clienteId);
  let best = null;
  vs.forEach(v => {
    const info = proximoServicioVehiculo(v.id);
    if(info && (!best || info.fecha < best.fecha)) best = Object.assign({vehiculoId: v.id}, info);
  });
  return best;
}
function ultimoContacto(clienteId){
  const list = state.contactos.filter(c => c.clienteId === clienteId).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return list[0] || null;
}
function contactosDelMes(mesStr, tipo){
  return state.contactos.filter(c => (c.fecha||'').slice(0,7) === mesStr && (!tipo || c.tipo === tipo));
}

/* Lista de {cliente, vehiculo, info} para todos los clientes con historial, para armar la sección */
function listaRecompra(){
  return state.clientes.map(c => {
    const info = proximoServicioCliente(c.id);
    const v = info ? state.vehiculos.find(x=>x.id===info.vehiculoId) : null;
    return {cliente:c, vehiculo:v, info};
  }).filter(x => x.info);
}

function registrarContacto(clienteId, vehiculoId, tipo){
  collectionRef('contactos').add({clienteId, vehiculoId: vehiculoId||null, tipo, fecha: todayISO(), createdAt: Date.now()});
}

function estadoPillHtml(info){
  if(info.estado === 'vencido') return `<span class="pill pill-red">Vencido hace ${Math.abs(info.dias)} días</span>`;
  if(info.estado === 'porVencer') return `<span class="pill pill-amber">Vence en ${info.dias} días</span>`;
  return `<span class="pill pill-ok">Al día · ${fmtDate(info.fecha)}</span>`;
}

function recompraRowHtml(item){
  const {cliente:c, vehiculo:v, info} = item;
  const contacto = ultimoContacto(c.id);
  const msg = fillTemplate(state.negocio.mensajeRecordatorio, {
    nombre: (c.nombre||'').split(' ')[0], vehiculo: v ? vehiculoLabel(v) : 'tu vehículo', taller: state.negocio.nombre
  });
  return `
    <div class="recontacto-row">
      <div class="info">
        <b>${esc(c.nombre)}</b>
        <span>${v ? esc(vehiculoLabel(v)) : ''} · Último service: ${fmtDate(info.ultimaFecha)}</span>
        ${contacto ? `<span> · Contactado por última vez: ${fmtDate(contacto.fecha)}</span>` : ''}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${estadoPillHtml(info)}
        ${c.telefono
          ? `<a class="btn btn-sm btn-wa" href="${waLink(c.telefono, msg)}" target="_blank" rel="noopener" data-action="marcarContactado" data-cliente="${c.id}" data-vehiculo="${v?v.id:''}">💬 Recordar service</a>`
          : `<span class="small muted">Sin teléfono</span>`}
      </div>
    </div>`;
}

function renderFidelizacion(){
  const all = listaRecompra();
  const vencidos = all.filter(x=>x.info.estado==='vencido').sort((a,b)=>a.info.fecha.localeCompare(b.info.fecha));
  const porVencer = all.filter(x=>x.info.estado==='porVencer').sort((a,b)=>a.info.fecha.localeCompare(b.info.fecha));
  const alDia = all.filter(x=>x.info.estado==='alDia').sort((a,b)=>a.info.fecha.localeCompare(b.info.fecha));
  const sinHistorial = state.clientes.filter(c => !vehiculosDeCliente(c.id).some(v=>ultimoTrabajoDeVehiculo(v.id)));

  const tabs = [
    {id:'vencidos', label:`Vencidos (${vencidos.length})`, list: vencidos},
    {id:'porVencer', label:`Por vencer (${porVencer.length})`, list: porVencer},
    {id:'alDia', label:`Al día (${alDia.length})`, list: alDia}
  ];
  const activeTab = tabs.find(t=>t.id===state.filtroFidelizacion) || tabs[0];

  const mesActual = todayISO().slice(0,7);
  const promosEsteMes = contactosDelMes(mesActual,'promo').length;
  const recordatoriosEsteMes = contactosDelMes(mesActual,'recordatorio').length;

  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Recompra</h1>
      <p class="lead">Acá vive la promesa de la campaña: quién tiene que volver y con un clic le mandás el WhatsApp. Nadie se pierde por no acordarse.</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="lbl">Vencidos</div><div class="val" style="color:var(--red-600);">${vencidos.length}</div><div class="sub">ya deberían haber vuelto</div></div>
      <div class="kpi-card"><div class="lbl">Por vencer (30 días)</div><div class="val" style="color:var(--amber);">${porVencer.length}</div><div class="sub">conviene avisarles ya</div></div>
      <div class="kpi-card"><div class="lbl">Recordatorios este mes</div><div class="val">${recordatoriosEsteMes}</div><div class="sub">clientes contactados</div></div>
      <div class="kpi-card accent"><div class="lbl">Promos enviadas</div><div class="val">${promosEsteMes}</div><div class="sub">este mes</div></div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <h2>Promoción mensual a toda la base <button class="btn btn-sm btn-primary" data-action="abrirPromoMasiva">📣 Armar envío</button></h2>
      <p class="small muted" style="margin:0;">Una vez por mes, mandale una propuesta a toda tu base para que vuelvan antes de que les toque el service. ${state.clientes.length} cliente${state.clientes.length===1?'':'s'} en la base${sinHistorial.length ? `, ${sinHistorial.length} sin trabajos todavía` : ''}.</p>
    </div>

    <div class="segmented" style="margin-bottom:14px;">
      ${tabs.map(t=>`<button class="${activeTab.id===t.id?'on':''}" data-action="fidelizacionTab" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>

    ${activeTab.list.length ? activeTab.list.map(recompraRowHtml).join('') : `<p class="empty">No hay clientes en este grupo por ahora.</p>`}

    ${sinHistorial.length ? `
      <h3 style="font-size:13px; color:var(--ink-600); margin-top:22px;">Sin trabajos registrados todavía (${sinHistorial.length})</h3>
      <div class="card-list">
        ${sinHistorial.map(c => `<div class="row-card" data-action="verCliente" data-id="${c.id}"><div class="top"><b>${esc(c.nombre)}</b><span class="pill pill-muted">Cliente nuevo</span></div><div class="meta">Todavía no tiene un trabajo guardado — no se puede estimar próximo service.</div></div>`).join('')}
      </div>` : ''}
    `;
}

function promoMasivaListHtml(){
  const q = (state._promoQuery||'').toLowerCase().trim();
  let list = state.clientes.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  if(q) list = list.filter(c => (c.nombre||'').toLowerCase().includes(q));
  const msg = state.negocio.mensajePromo;
  return list.length ? list.map(c => {
    const vs = vehiculosDeCliente(c.id);
    const contacto = state.contactos.filter(x=>x.clienteId===c.id && x.tipo==='promo').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
    const personalMsg = fillTemplate(msg, {nombre:(c.nombre||'').split(' ')[0], vehiculo: vs[0]?vehiculoLabel(vs[0]):'', taller: state.negocio.nombre});
    return `<div class="recontacto-row">
      <div class="info"><b>${esc(c.nombre)}</b><span>${c.telefono?esc(c.telefono):'Sin teléfono'}${contacto?` · Promo enviada ${fmtDate(contacto.fecha)}`:''}</span></div>
      ${c.telefono ? `<a class="btn btn-sm btn-wa" href="${waLink(c.telefono, personalMsg)}" target="_blank" rel="noopener" data-action="marcarPromoEnviada" data-cliente="${c.id}">💬 Enviar</a>` : `<span class="small muted">Sin teléfono</span>`}
    </div>`;
  }).join('') : `<p class="empty">Sin clientes que coincidan.</p>`;
}
function promoMasivaHtml(){
  return `
    <div class="modal-head"><h2>Promoción mensual</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="field"><label>Mensaje (se completa por cliente)</label><textarea id="promo_msg" rows="3" data-input="promoMensajeInput">${esc(state.negocio.mensajePromo)}</textarea></div>
    <div class="searchbar" style="margin-bottom:12px;"><span class="ico">🔎</span><input placeholder="Buscar cliente…" data-input="promoQueryInput" value="${esc(state._promoQuery||'')}"></div>
    <div class="card-list" id="promo_list" style="max-height:360px; overflow-y:auto;">${promoMasivaListHtml()}</div>`;
}
inputActions.promoQueryInput = (el) => { state._promoQuery = el.value; document.getElementById('promo_list').innerHTML = promoMasivaListHtml(); };
inputActions.promoMensajeInput = (el) => { state.negocio.mensajePromo = el.value; configSet({mensajePromo: el.value}); document.getElementById('promo_list').innerHTML = promoMasivaListHtml(); };

Object.assign(actions, {
  fidelizacionTab(el){ state.filtroFidelizacion = el.dataset.tab; renderFidelizacion(); },
  abrirPromoMasiva(){ state._promoQuery=''; openModal(promoMasivaHtml(), {wide:true}); },
  marcarContactado(el){ registrarContacto(el.dataset.cliente, el.dataset.vehiculo, 'recordatorio'); toast('Recordatorio registrado.'); setTimeout(renderFidelizacion, 300); },
  marcarPromoEnviada(el){
    registrarContacto(el.dataset.cliente, null, 'promo');
    toast('Promo registrada.');
    setTimeout(() => { const l = document.getElementById('promo_list'); if(l) l.innerHTML = promoMasivaListHtml(); }, 300);
  }
});
