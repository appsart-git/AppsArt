'use strict';
/* ===================== PRESUPUESTOS ===================== */
// El paso que viene antes del trabajo: el taller arma el presupuesto (mano de obra + repuestos,
// tomados del stock o cargados a mano), lo manda como PDF o por WhatsApp, y cuando el cliente
// dice que sí, "Aprobar" lo convierte en el Nuevo informe con todo ya cargado. Al guardar ese
// trabajo se descuentan los repuestos del stock (app-stock.js) y el presupuesto queda vinculado.

const ESTADOS_PRESU = {
  pendiente: {label:'Sin enviar', pill:'pill-muted'},
  enviado: {label:'Enviado', pill:'pill-amber'},
  aprobado: {label:'Aprobado', pill:'pill-ok'},
  rechazado: {label:'Rechazado', pill:'pill-red'}
};

function presupuestoNumero(p){ return 'P-' + String(p.numero||0).padStart(4,'0'); }
function siguienteNumeroPresupuesto(){ return state.presupuestos.reduce((m,p)=>Math.max(m, p.numero||0), 0) + 1; }
function presuItems(p, tipo){ return (p.items||[]).filter(it => it.tipo === tipo && (it.descripcion||'').trim()); }
function presuTotales(p){
  const manoObra = presuItems(p, 'mo').reduce((s,it)=>s + (Number(it.precio)||0), 0);
  const repuestos = presuItems(p, 'rep').reduce((s,it)=>s + (Number(it.precio)||0) * (Number(it.cantidad)||1), 0);
  const descuento = Math.round((manoObra + repuestos) * (Number(p.descuento)||0) / 100);
  return {manoObra, repuestos, descuento, total: manoObra + repuestos - descuento};
}
function presuVence(p){
  const d = new Date((p.fecha||todayISO()) + 'T00:00:00');
  d.setDate(d.getDate() + (Number(p.validezDias)||15));
  return d.toISOString().slice(0,10);
}
function presuCliente(p){ return state.clientes.find(c => c.id === p.clienteId) || {nombre: p.nombre, telefono: p.telefono}; }
function presuVehiculo(p){ return state.vehiculos.find(v => v.id === p.vehiculoId) || null; }
function presuVehiculoTxt(p){
  const v = presuVehiculo(p);
  return v ? vehiculoLabel(v) : [p.patente && p.patente.toUpperCase(), p.marca, p.modelo].filter(Boolean).join(' ') || '—';
}
// Repuestos del presupuesto que hoy no alcanzan en el stock (para avisar antes de aprobar).
function presuFaltantes(p){
  return presuItems(p, 'rep').filter(it => it.repuestoId).map(it => {
    const r = findRepuesto(it.repuestoId);
    const hay = r ? Number(r.stock)||0 : 0;
    return {it, hay, falta: (Number(it.cantidad)||1) - hay};
  }).filter(x => x.falta > 0);
}
function mensajePresupuesto(p){
  const c = presuCliente(p), t = presuTotales(p);
  return fillTemplate(state.negocio.mensajePresupuesto, {
    nombre: (c.nombre||'').split(' ')[0], taller: state.negocio.nombre, vehiculo: presuVehiculoTxt(p),
    total: money(t.total), numero: presupuestoNumero(p), vence: fmtDate(presuVence(p))
  });
}

/* ---------- listado ---------- */
function presupuestosDeTab(tab){
  const list = state.presupuestos.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(tab === 'pendientes') return list.filter(p => p.estado === 'pendiente' || p.estado === 'enviado');
  return list.filter(p => p.estado === tab);
}

function renderPresupuestos(){
  if(state._presupuesto){ renderPresupuestoForm(); return; }
  const mes = todayISO().slice(0,7);
  const abiertos = presupuestosDeTab('pendientes');
  const aprobadosMes = state.presupuestos.filter(p => p.estado === 'aprobado' && (p.aprobadoFecha || p.fecha || '').slice(0,7) === mes);
  const cerrados = state.presupuestos.filter(p => p.estado === 'aprobado' || p.estado === 'rechazado');
  const tasa = cerrados.length ? Math.round(cerrados.filter(p=>p.estado==='aprobado').length / cerrados.length * 100) : null;
  const tab = state.filtroPresupuestos;
  const list = presupuestosDeTab(tab);
  const count = (t) => presupuestosDeTab(t).length;
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Presupuestos</h1>
      <button class="btn btn-primary" data-action="nuevoPresupuesto">+ Nuevo presupuesto</button>
      <p class="lead">Armalo en un minuto con precios del stock, mandalo por WhatsApp y, cuando el cliente aprueba, pasa directo al informe.</p>
    </div>
    <div class="kpi-grid-3">
      <div class="kpi-card"><div class="lbl">Esperando respuesta</div><div class="val">${abiertos.length}</div><div class="sub">${money(abiertos.reduce((s,p)=>s+presuTotales(p).total,0))} en juego</div></div>
      <div class="kpi-card"><div class="lbl">Aprobados este mes</div><div class="val" style="color:var(--green);">${money(aprobadosMes.reduce((s,p)=>s+presuTotales(p).total,0))}</div><div class="sub">${aprobadosMes.length} presupuesto${aprobadosMes.length===1?'':'s'}</div></div>
      <div class="kpi-card accent"><div class="lbl">Tasa de aprobación</div><div class="val">${tasa==null?'—':tasa+'%'}</div><div class="sub">de los que ya tuvieron respuesta</div></div>
    </div>
    <div class="filters-row">
      <div class="segmented">
        <button class="${tab==='pendientes'?'on':''}" data-action="presuTab" data-tab="pendientes">Abiertos (${count('pendientes')})</button>
        <button class="${tab==='aprobado'?'on':''}" data-action="presuTab" data-tab="aprobado">Aprobados (${count('aprobado')})</button>
        <button class="${tab==='rechazado'?'on':''}" data-action="presuTab" data-tab="rechazado">Rechazados (${count('rechazado')})</button>
      </div>
    </div>
    ${list.length ? list.map(presupuestoCardHtml).join('') : `<p class="empty">${tab==='pendientes' ? 'No hay presupuestos esperando respuesta. Armá uno con "+ Nuevo presupuesto".' : 'Nada por acá todavía.'}</p>`}`;
}

function presupuestoCardHtml(p){
  const c = presuCliente(p), t = presuTotales(p), est = ESTADOS_PRESU[p.estado] || ESTADOS_PRESU.pendiente;
  const vence = presuVence(p), abierto = p.estado === 'pendiente' || p.estado === 'enviado';
  const vencido = abierto && diffDays(vence) < 0;
  const faltan = abierto ? presuFaltantes(p) : [];
  const mo = presuItems(p, 'mo').map(it => it.descripcion);
  return `
    <div class="orden-card">
      <div class="top">
        <div>
          <b>${esc(c.nombre||'Cliente')}</b> <span class="muted small">· ${presupuestoNumero(p)}</span>
          <div class="muted small">${esc(presuVehiculoTxt(p))} · ${fmtDate(p.fecha)}${abierto ? ` · ${vencido ? '<span style="color:var(--red-600); font-weight:600;">venció el '+fmtDate(vence)+'</span>' : 'vale hasta '+fmtDate(vence)}` : ''}</div>
        </div>
        <div style="text-align:right;"><div style="font-family:Oswald,sans-serif; font-size:20px; font-weight:700;">${money(t.total)}</div><span class="pill ${est.pill}">${est.label}</span></div>
      </div>
      ${mo.length ? `<p class="small" style="margin:8px 0 0;">${esc(mo.join(' · '))}</p>` : ''}
      ${faltan.length ? `<p class="small" style="margin:6px 0 0; color:var(--amber); font-weight:600;">⚠ Hay que pedir: ${faltan.map(f => esc(f.falta + ' x ' + f.it.descripcion)).join(', ')}</p>` : ''}
      ${p.estado==='aprobado' && p.trabajoId ? `<p class="small muted" style="margin:6px 0 0;">✅ Trabajo realizado y guardado en el historial.</p>` : ''}
      <div class="orden-actions">
        <button class="btn btn-sm btn-ghost" data-action="verPresupuesto" data-id="${p.id}">📄 Ver presupuesto</button>
        ${abierto ? `
          ${c.telefono ? `<a class="btn btn-sm btn-wa" href="${waLink(c.telefono, mensajePresupuesto(p))}" target="_blank" rel="noopener" data-action="presupuestoEnviado" data-id="${p.id}">💬 Enviar por WhatsApp</a>` : ''}
          <button class="btn btn-sm btn-primary" data-action="aprobarPresupuesto" data-id="${p.id}">✓ Aprobado</button>
          <button class="btn btn-sm btn-ghost" data-action="editarPresupuesto" data-id="${p.id}">✏️ Editar</button>
          <button class="btn-danger" data-action="rechazarPresupuesto" data-id="${p.id}">Rechazado</button>`
        : p.estado === 'aprobado' && !p.trabajoId ? `<button class="btn btn-sm btn-share" data-action="presupuestoAInforme" data-id="${p.id}">🧾 Pasar al informe</button>`
        : p.estado === 'rechazado' ? `<button class="btn btn-sm btn-ghost" data-action="reabrirPresupuesto" data-id="${p.id}">↺ Reabrir</button>` : ''}
        ${!p.trabajoId ? `<button class="btn-danger" data-action="eliminarPresupuesto" data-id="${p.id}">Eliminar</button>` : ''}
      </div>
    </div>`;
}

/* ---------- formulario ---------- */
function blankPresupuesto(){
  return {id:null, clienteId:null, vehiculoId:null, nombre:'', telefono:'', patente:'', marca:'', modelo:'',
    fecha: todayISO(), validezDias: 15, descuento: 0, notas: '',
    items: [{tipo:'mo', descripcion:'', precio:0}]};
}
function savePresupuestoDraft(){ try{ localStorage.setItem(lsKey('presupuesto_borrador'), JSON.stringify(state._presupuesto)); }catch(e){ /* sin borrador */ } }
function clearPresupuestoDraft(){ try{ localStorage.removeItem(lsKey('presupuesto_borrador')); }catch(e){ /* nada */ } }

function presuLineHtml(it, i){
  if(it.tipo === 'mo') return `
    <div class="presu-line mo">
      <input class="pl-in d" data-pl="descripcion" data-i="${i}" value="${esc(it.descripcion)}" placeholder="Ej: Cambio de pastillas de freno">
      <input class="pl-in" type="number" min="0" step="500" data-pl="precio" data-i="${i}" value="${it.precio||''}" placeholder="$ mano de obra">
      <button class="btn-danger pl-x" data-action="quitarLineaPresu" data-i="${i}" aria-label="Quitar">✕</button>
    </div>`;
  const r = it.repuestoId ? findRepuesto(it.repuestoId) : null;
  const hay = r ? Number(r.stock)||0 : null, cant = Number(it.cantidad)||1;
  const disp = r ? (hay >= cant ? `<span class="pill pill-ok">📦 hay ${hay}</span>` : `<span class="pill pill-amber">📦 hay ${hay} · pedir ${cant-hay}</span>`) : '';
  return `
    <div class="presu-line rep">
      ${r ? `<div class="d pl-stock"><b>${esc(it.descripcion)}</b> ${disp}</div>` : `<input class="pl-in d" data-pl="descripcion" data-i="${i}" value="${esc(it.descripcion)}" placeholder="Repuesto (no está en stock)">`}
      <input class="pl-in" type="number" min="1" step="1" data-pl="cantidad" data-i="${i}" value="${cant}" aria-label="Cantidad" title="Cantidad">
      <input class="pl-in" type="number" min="0" step="100" data-pl="precio" data-i="${i}" value="${it.precio||''}" placeholder="$ unitario" title="Precio unitario">
      <button class="btn-danger pl-x" data-action="quitarLineaPresu" data-i="${i}" aria-label="Quitar">✕</button>
    </div>`;
}
function presuTotalesHtml(p){
  const t = presuTotales(p);
  return `
    <div class="r-cost-row"><span>Mano de obra</span><b>${money(t.manoObra)}</b></div>
    <div class="r-cost-row"><span>Repuestos</span><b>${money(t.repuestos)}</b></div>
    ${t.descuento ? `<div class="r-cost-row"><span>Descuento ${Number(p.descuento)}%</span><b>− ${money(t.descuento)}</b></div>` : ''}
    <div class="r-cost-row total"><span>Total</span><b>${money(t.total)}</b></div>`;
}

function renderPresupuestoForm(){
  const p = state._presupuesto;
  const cliente = p.clienteId ? state.clientes.find(c => c.id === p.clienteId) : null;
  const vs = cliente ? vehiculosDeCliente(cliente.id) : [];
  const idxs = (tipo) => p.items.map((it,i)=>({it,i})).filter(x => x.it.tipo === tipo);
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>${p.id ? 'Editar presupuesto ' + presupuestoNumero(p) : 'Nuevo presupuesto'}</h1>
      <button class="btn btn-ghost" data-action="cancelarPresupuesto">← Volver</button>
    </div>
    <div class="ingreso-form">
      <div class="panel">
        <h2>Cliente y vehículo <button class="btn btn-sm btn-ghost" data-action="buscarClientePresu">🔎 Buscar existente</button></h2>
        ${cliente ? `
          <div class="pill pill-ok" style="margin-bottom:12px; display:inline-flex; align-items:center; gap:8px;">${esc(cliente.nombre)} · ${esc(cliente.telefono||'sin teléfono')} <button class="btn-danger" style="padding:1px 8px; font-size:11px;" data-action="quitarClientePresu">Quitar</button></div>
          ${vs.length ? `<div class="field"><label>Vehículo</label><select data-change="presu_vehiculo"><option value="">＋ Otro vehículo</option>${vs.map(v=>`<option value="${v.id}" ${p.vehiculoId===v.id?'selected':''}>${esc(vehiculoLabel(v))}</option>`).join('')}</select></div>` : ''}`
        : `
          <div class="row2">
            <div class="field"><label>Nombre</label><input data-pf="nombre" value="${esc(p.nombre)}" placeholder="Nombre y apellido"></div>
            <div class="field"><label>Teléfono (WhatsApp)</label><input data-pf="telefono" value="${esc(p.telefono)}" placeholder="291 412 3456" inputmode="tel"></div>
          </div>`}
        ${!p.vehiculoId ? `
          <div class="row3">
            <div class="field"><label>Marca</label><input data-pf="marca" value="${esc(p.marca)}" placeholder="Fiat"></div>
            <div class="field"><label>Modelo</label><input data-pf="modelo" value="${esc(p.modelo)}" placeholder="Cronos"></div>
            <div class="field"><label>Patente</label><input data-pf="patente" value="${esc(p.patente)}" placeholder="AD361KQ" style="text-transform:uppercase;"></div>
          </div>` : ''}
      </div>

      <div class="panel">
        <h2>Mano de obra</h2>
        <div id="presuMo">${idxs('mo').map(x => presuLineHtml(x.it, x.i)).join('') || '<p class="small muted" style="margin:0 0 8px;">Sin trabajos cargados.</p>'}</div>
        <button class="add-row-btn" data-action="agregarLineaPresu" data-tipo="mo">＋ Agregar trabajo</button>
      </div>

      <div class="panel">
        <h2>Repuestos</h2>
        <div class="presu-line-head"><span>Repuesto</span><span>Cant.</span><span>$ unit.</span><span></span></div>
        <div id="presuRep">${idxs('rep').map(x => presuLineHtml(x.it, x.i)).join('') || '<p class="small muted" style="margin:0 0 8px;">Sin repuestos cargados.</p>'}</div>
        ${stockPickerHtml('presuStockInput', 'presuStockResults')}
        <button class="add-row-btn" style="margin-top:8px;" data-action="agregarLineaPresu" data-tipo="rep">＋ Repuesto que no está en stock</button>
      </div>

      <div class="panel">
        <h2>Condiciones y total</h2>
        <div class="row3">
          <div class="field"><label>Fecha</label><input type="date" data-pf="fecha" value="${esc(p.fecha)}"></div>
          <div class="field"><label>Válido por (días)</label><input type="number" min="1" data-pf="validezDias" value="${esc(p.validezDias)}"></div>
          <div class="field"><label>Descuento (%)</label><input type="number" min="0" max="100" data-pf="descuento" value="${esc(p.descuento)}"></div>
        </div>
        <div class="field"><label>Notas para el cliente</label><textarea rows="2" data-pf="notas" placeholder="Ej: incluye alineación sin cargo. Garantía de 6 meses en mano de obra.">${esc(p.notas)}</textarea></div>
        <div class="r-cost-card" id="presuTotales">${presuTotalesHtml(p)}</div>
      </div>

      <div class="ingreso-actions">
        <button class="btn btn-ghost" data-action="cancelarPresupuesto">Cancelar</button>
        <button class="btn btn-primary" style="flex:1;" data-action="guardarPresupuesto">💾 Guardar y ver presupuesto</button>
      </div>
    </div>`;

  wireStockPicker('presuStockInput', 'presuStockResults', (r) => {
    const ya = p.items.find(it => it.repuestoId === r.id);
    if(ya) ya.cantidad = (Number(ya.cantidad)||1) + 1;
    else p.items.push({tipo:'rep', repuestoId:r.id, descripcion: r.descripcion + (r.marca ? ' ' + r.marca : ''), cantidad:1, precio: r.precioVenta||0});
    savePresupuestoDraft(); renderPresupuestoForm();
  });
}

// Inputs del formulario: se guardan en el borrador sin re-dibujar todo (para no perder el foco),
// salvo el total, que se recalcula en vivo.
document.addEventListener('input', (e) => {
  const p = state._presupuesto;
  if(!p) return;
  const pf = e.target.closest('[data-pf]'), pl = e.target.closest('[data-pl]');
  if(pf) p[pf.dataset.pf] = pf.type === 'number' ? (Number(pf.value)||0) : pf.value;
  else if(pl){
    const it = p.items[+pl.dataset.i];
    if(!it) return;
    it[pl.dataset.pl] = pl.type === 'number' ? (Number(pl.value)||0) : pl.value;
    if(pl.dataset.pl === 'cantidad' && it.repuestoId){
      // Actualiza el aviso de disponibilidad de esa línea sin re-render.
      const r = findRepuesto(it.repuestoId), hay = r ? Number(r.stock)||0 : 0, cant = Math.max(1, Number(it.cantidad)||1);
      const pill = pl.closest('.presu-line').querySelector('.pill');
      if(pill){ pill.className = 'pill ' + (hay >= cant ? 'pill-ok' : 'pill-amber'); pill.textContent = hay >= cant ? `📦 hay ${hay}` : `📦 hay ${hay} · pedir ${cant-hay}`; }
    }
  } else return;
  const tot = document.getElementById('presuTotales');
  if(tot) tot.innerHTML = presuTotalesHtml(p);
  savePresupuestoDraft();
});
inputActions.presu_vehiculo = (el) => { state._presupuesto.vehiculoId = el.value || null; savePresupuestoDraft(); renderPresupuestoForm(); };

async function guardarPresupuesto(){
  const p = state._presupuesto;
  const items = p.items.filter(it => (it.descripcion||'').trim()).map(it => Object.assign({}, it, {cantidad: it.tipo==='rep' ? Math.max(1, Number(it.cantidad)||1) : undefined}));
  items.forEach(it => { if(it.cantidad === undefined) delete it.cantidad; });
  if(!p.clienteId && !(p.nombre||'').trim()){ toast('Falta el nombre del cliente.'); return null; }
  if(!items.length){ toast('Agregá al menos un trabajo o un repuesto.'); return null; }
  markSaving();
  try{
    let clienteId = p.clienteId, vehiculoId = p.vehiculoId;
    // Un presupuesto también suma clientes a la base: si no existía, se crea (con su vehículo).
    if(!clienteId){
      clienteId = await collectionRef('clientes').add({nombre:p.nombre.trim(), telefono:(p.telefono||'').trim(), direccion:'', createdAt:Date.now()});
    }
    if(!vehiculoId && (p.patente || p.marca || p.modelo)){
      vehiculoId = await collectionRef('vehiculos').add({clienteId, patente:(p.patente||'').trim().toUpperCase(), marca:(p.marca||'').trim(), modelo:(p.modelo||'').trim(), anio:'', createdAt:Date.now()});
    }
    const data = {clienteId, vehiculoId: vehiculoId || null, fecha: p.fecha || todayISO(), validezDias: Number(p.validezDias)||15,
      descuento: Number(p.descuento)||0, notas: (p.notas||'').trim(), items};
    data.total = presuTotales(data).total;
    let id = p.id;
    if(id) await collectionRef('presupuestos').update(id, data);
    else id = await collectionRef('presupuestos').add(Object.assign({numero: siguienteNumeroPresupuesto(), estado:'pendiente', createdAt:Date.now()}, data));
    doneSaving();
    state._presupuesto = null; clearPresupuestoDraft();
    return id;
  }catch(e){ saveError(e); return null; }
}

/* ---------- documento (PDF) — misma estética que el acta de ingreso ---------- */
function presupuestoDocHtml(p){
  const c = presuCliente(p), v = presuVehiculo(p), t = presuTotales(p);
  const mo = presuItems(p, 'mo'), rep = presuItems(p, 'rep');
  return `
  <div id="presuDoc">
    <div class="a-head">
      <img src="./logo-tutaller.png" alt="${esc(state.negocio.nombre||'Tu Taller')}">
      <div class="meta">
        <div class="eb">${esc((state.negocio.nombre||'').toUpperCase())}</div>
        <div class="tt">PRESUPUESTO</div>
        <span class="nro">${presupuestoNumero(p)}</span>
        <div class="fh">${fmtDate(p.fecha)}</div>
      </div>
    </div>
    <div class="a-sec">
      <div class="a-grid3">
        <div class="a-box"><div class="k">Cliente</div><div class="v">${esc(c.nombre||'—')}</div><div class="s">${esc(c.telefono||'')}</div></div>
        <div class="a-box"><div class="k">Vehículo</div><div class="v">${esc(v ? `${v.marca||''} ${v.modelo||''}`.trim() : [p.marca,p.modelo].filter(Boolean).join(' ') || '—')}</div><div class="s">${v && v.patente || p.patente ? 'Patente ' + esc((v ? v.patente : p.patente).toUpperCase()) : ''}${v && v.anio ? ' · ' + esc(v.anio) : ''}</div></div>
        <div class="a-box"><div class="k">Válido hasta</div><div class="v">${fmtDate(presuVence(p))}</div><div class="s">${Number(p.validezDias)||15} días desde la emisión</div></div>
      </div>
    </div>
    ${mo.length ? `<div class="a-sec">
      <div class="a-h"><span>Mano de obra</span></div>
      <table class="a-items"><tbody>${mo.map(it => `<tr><td>${esc(it.descripcion)}</td><td class="n">${money(it.precio)}</td></tr>`).join('')}</tbody></table>
    </div>` : ''}
    ${rep.length ? `<div class="a-sec">
      <div class="a-h"><span>Repuestos</span></div>
      <table class="a-items">
        <thead><tr><th>Descripción</th><th class="n">Cant.</th><th class="n">Unitario</th><th class="n">Subtotal</th></tr></thead>
        <tbody>${rep.map(it => `<tr><td>${esc(it.descripcion)}</td><td class="n">${Number(it.cantidad)||1}</td><td class="n">${money(it.precio)}</td><td class="n">${money((Number(it.precio)||0)*(Number(it.cantidad)||1))}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
    <div class="a-sec">
      <div class="a-grid2" style="align-items:start;">
        <div>${p.notas ? `<div class="a-h">Notas</div><div class="a-text">${esc(p.notas)}</div>` : ''}
          <div class="a-firma" style="grid-template-columns:1fr; margin-top:${p.notas?'14px':'0'};"><div class="legal">Presupuesto sin cargo y sin compromiso. Los precios de repuestos pueden variar según disponibilidad del proveedor pasada la fecha de validez. Si durante el trabajo aparece algo no incluido acá, se consulta antes de hacerlo.</div></div>
        </div>
        <div class="a-tot">
          <div><span>Mano de obra</span><b>${money(t.manoObra)}</b></div>
          <div><span>Repuestos</span><b>${money(t.repuestos)}</b></div>
          ${t.descuento ? `<div><span>Descuento ${Number(p.descuento)}%</span><b>− ${money(t.descuento)}</b></div>` : ''}
          <div class="tot"><span>TOTAL</span><b>${money(t.total)}</b></div>
        </div>
      </div>
    </div>
    <div class="a-foot">
      <b>${esc((state.negocio.nombre||'').toUpperCase())}</b>
      <span>${esc(state.negocio.direccion||'')}${state.negocio.telefono?' · '+esc(state.negocio.telefono):''}</span>
      <span class="made-by">by <img src="./appsart-brand.png" alt="AppsArt"></span>
    </div>
  </div>`;
}
function abrirPresupuesto(id){
  const p = state.presupuestos.find(x => x.id === id);
  if(!p) return;
  const c = presuCliente(p), abierto = p.estado === 'pendiente' || p.estado === 'enviado';
  openModal(`
    <div class="modal-head"><h2>Presupuesto ${presupuestoNumero(p)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="acta-wrap" id="presuWrap">${presupuestoDocHtml(p)}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="presuPdf" data-id="${p.id}">⬇ Descargar PDF</button>
      <button class="btn btn-share" data-action="presuCompartir" data-id="${p.id}">📤 Compartir PDF</button>
      ${c.telefono ? `<a class="btn btn-wa" href="${waLink(c.telefono, mensajePresupuesto(p))}" target="_blank" rel="noopener" data-action="presupuestoEnviado" data-id="${p.id}">💬 WhatsApp</a>` : ''}
      ${abierto ? `<button class="btn btn-primary" data-action="aprobarPresupuesto" data-id="${p.id}">✓ Aprobado</button>` : ''}
    </div>
    <p class="small muted" style="text-align:right; margin:8px 0 0;">Desde el celular, "Compartir PDF" abre WhatsApp con el presupuesto adjunto.</p>`, {wide:true});
  requestAnimationFrame(scalePresuDoc);
}
function scalePresuDoc(){
  const doc = document.getElementById('presuDoc'), wrap = document.getElementById('presuWrap');
  if(!doc || !wrap) return;
  const scale = Math.min(1, (wrap.clientWidth - 36) / 820);
  doc.style.transform = `scale(${scale})`;
  wrap.style.height = (doc.scrollHeight * scale + 36) + 'px';
}
window.addEventListener('resize', scalePresuDoc);
async function buildPresuPdfBlob(){
  const doc = document.getElementById('presuDoc');
  await waitImagesReady(doc);
  const prev = doc.style.transform;
  doc.style.transform = 'none'; doc.style.boxShadow = 'none';
  void doc.offsetHeight;
  const h = doc.scrollHeight;
  let canvas;
  try{ canvas = await html2canvas(doc, {scale:2, backgroundColor:'#ffffff', width:820, height:h, windowWidth:820}); }
  finally{ doc.style.transform = prev; doc.style.boxShadow = ''; }
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({unit:'px', format:[820, h], hotfixes:['px_scaling']});
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 820, h);
  return pdf.output('blob');
}
function presuFileName(p){
  return 'presupuesto-' + String(p.numero||0).padStart(4,'0') + '-' + (presuVehiculoTxt(p) || 'vehiculo').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '.pdf';
}
function marcarPresuEnviado(p){
  if(p.estado === 'pendiente') collectionRef('presupuestos').update(p.id, {estado:'enviado', enviadoAt:Date.now()});
  collectionRef('contactos').add({clienteId:p.clienteId, vehiculoId:p.vehiculoId||null, presupuestoId:p.id, tipo:'presupuesto', fecha:todayISO(), createdAt:Date.now()});
}

/* ---------- aprobado → Nuevo informe con todo cargado ---------- */
function cargarPresupuestoEnInforme(p){
  cargarClienteVehiculoComoInforme(p.clienteId, p.vehiculoId);
  const inf = state.informe, t = presuTotales(p);
  inf.presupuestoId = p.id;
  const mo = presuItems(p, 'mo'), rep = presuItems(p, 'rep');
  inf.trabajos = mo.length ? mo.map(it => it.descripcion) : [''];
  inf.repuestos = rep.length ? rep.map(it => ({nombre: it.descripcion, marca:'', costo:(Number(it.precio)||0)*(Number(it.cantidad)||1),
    repuestoId: it.repuestoId || undefined, cantidad: Number(it.cantidad)||1, precioUnit: Number(it.precio)||0})) : [{nombre:'',marca:'',costo:0}];
  inf.repuestos.forEach(r => { if(!r.repuestoId){ delete r.repuestoId; } });
  // El descuento se aplica sobre la mano de obra, que es lo que el taller puede ajustar.
  inf.fields.manoobra = String(Math.max(0, t.manoObra - t.descuento));
  inf.obs = ['Según presupuesto ' + presupuestoNumero(p) + ' aprobado por el cliente.'];
  // Si el auto ya está en el taller con acta, el informe queda vinculado a ese ingreso.
  const ing = p.vehiculoId && ingresosEnTaller().find(i => i.vehiculoId === p.vehiculoId);
  if(ing){ inf.ingresoId = ing.id; inf.fields.km = fmtKm(ing.km); inf.photo = (ing.fotos && (ing.fotos.frente || ing.fotos.izq)) || null; }
}

Object.assign(actions, {
  presuTab(el){ state.filtroPresupuestos = el.dataset.tab; renderPresupuestos(); },
  nuevoPresupuesto(){ state._presupuesto = blankPresupuesto(); savePresupuestoDraft(); renderPresupuestos(); window.scrollTo(0,0); },
  editarPresupuesto(el){
    const p = state.presupuestos.find(x => x.id === el.dataset.id);
    if(!p) return;
    const draft = Object.assign(blankPresupuesto(), JSON.parse(JSON.stringify(p)));
    draft.items = draft.items && draft.items.length ? draft.items : blankPresupuesto().items;
    state._presupuesto = draft; savePresupuestoDraft(); renderPresupuestos(); window.scrollTo(0,0);
  },
  cancelarPresupuesto(){ state._presupuesto = null; clearPresupuestoDraft(); renderPresupuestos(); window.scrollTo(0,0); },
  agregarLineaPresu(el){
    const tipo = el.dataset.tipo;
    state._presupuesto.items.push(tipo === 'mo' ? {tipo, descripcion:'', precio:0} : {tipo, descripcion:'', cantidad:1, precio:0});
    savePresupuestoDraft(); renderPresupuestoForm();
    const ins = document.querySelectorAll(`#${tipo==='mo'?'presuMo':'presuRep'} .pl-in.d`);
    if(ins.length) ins[ins.length-1].focus();
  },
  quitarLineaPresu(el){ state._presupuesto.items.splice(+el.dataset.i, 1); savePresupuestoDraft(); renderPresupuestoForm(); },
  buscarClientePresu(){ state._buscadorClienteQuery=''; state._buscadorClienteTarget='elegirClientePresu'; openModal(buscadorClienteHtml()); },
  elegirClientePresu(el){
    const c = state.clientes.find(x => x.id === el.dataset.id);
    if(!c) return;
    const vs = vehiculosDeCliente(c.id);
    Object.assign(state._presupuesto, {clienteId:c.id, nombre:c.nombre||'', telefono:c.telefono||'', vehiculoId: vs.length===1 ? vs[0].id : null});
    savePresupuestoDraft(); closeModal(); renderPresupuestoForm();
  },
  quitarClientePresu(){ Object.assign(state._presupuesto, {clienteId:null, vehiculoId:null, nombre:'', telefono:''}); savePresupuestoDraft(); renderPresupuestoForm(); },
  guardarPresupuesto(el){
    withBusyButton(el, 'Guardando…', async () => {
      const id = await guardarPresupuesto();
      if(!id) return;
      state.filtroPresupuestos = 'pendientes';
      renderPresupuestos(); window.scrollTo(0,0);
      abrirPresupuesto(id);
      toast('Presupuesto guardado. Mandalo por WhatsApp o como PDF.');
    });
  },
  verPresupuesto(el){ abrirPresupuesto(el.dataset.id); },
  presupuestoEnviado(el){
    const p = state.presupuestos.find(x => x.id === el.dataset.id);
    if(p) marcarPresuEnviado(p);
  },
  presuPdf(el){
    const p = state.presupuestos.find(x => x.id === el.dataset.id);
    withBusyButton(el, 'Generando…', async () => {
      try{ downloadBlob(await buildPresuPdfBlob(), presuFileName(p)); }
      catch(e){ console.error(e); alert('No se pudo generar el PDF. Probá de nuevo.'); }
    });
  },
  presuCompartir(el){
    const p = state.presupuestos.find(x => x.id === el.dataset.id);
    withBusyButton(el, 'Generando…', async () => {
      try{
        const blob = await buildPresuPdfBlob();
        const file = new File([blob], presuFileName(p), {type:'application/pdf'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title:'Presupuesto ' + presupuestoNumero(p), text: mensajePresupuesto(p)});
          marcarPresuEnviado(p);
        } else {
          downloadBlob(blob, presuFileName(p));
          toast('En la compu se descarga. Desde el celu se abre WhatsApp directo.');
        }
      }catch(e){ if(e && e.name==='AbortError') return; alert('No se pudo compartir el PDF. Probá con "Descargar PDF".'); }
    });
  },
  aprobarPresupuesto(el){
    const p = state.presupuestos.find(x => x.id === el.dataset.id);
    if(!p) return;
    const faltan = presuFaltantes(p);
    openModal(`
      <div class="modal-head"><h2>Presupuesto aprobado 🎉</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
      <p style="margin-top:-4px;"><b>${esc(presuCliente(p).nombre||'')}</b> aprobó ${presupuestoNumero(p)} por <b>${money(presuTotales(p).total)}</b>.</p>
      ${faltan.length ? `<div class="panel" style="background:#fdf6e7; box-shadow:none; margin-bottom:12px;"><b style="color:var(--amber);">⚠ Falta stock para este trabajo</b>
        <ul class="small" style="margin:6px 0 0; padding-left:18px;">${faltan.map(f => `<li>${esc(f.it.descripcion)}: hay ${f.hay}, se necesitan ${Number(f.it.cantidad)||1}</li>`).join('')}</ul>
        <p class="small muted" style="margin:6px 0 0;">Cargalo como "Entrada" en Stock cuando llegue.</p></div>` : `<p class="small muted">✅ Hay stock de todos los repuestos del presupuesto.</p>`}
      <p class="small muted">"Pasar al informe" arma el Nuevo informe con los trabajos, repuestos y precios de este presupuesto. Al guardar el trabajo, los repuestos se descuentan del stock.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="soloAprobarPresupuesto" data-id="${p.id}">Solo marcar aprobado</button>
        <button class="btn btn-primary" data-action="presupuestoAInforme" data-id="${p.id}">🧾 Aprobar y pasar al informe</button>
      </div>`);
  },
  soloAprobarPresupuesto(el){
    closeModal(); markSaving();
    collectionRef('presupuestos').update(el.dataset.id, {estado:'aprobado', aprobadoFecha: todayISO()}).then(doneSaving).catch(saveError);
    toast('Presupuesto marcado como aprobado.');
  },
  presupuestoAInforme(el){
    const p = state.presupuestos.find(x => x.id === el.dataset.id);
    if(!p) return;
    if(p.estado !== 'aprobado') collectionRef('presupuestos').update(p.id, {estado:'aprobado', aprobadoFecha: todayISO()});
    cargarPresupuestoEnInforme(p);
    goSection('informe');
    toast('Informe armado desde el presupuesto. Revisalo, sumá fotos y guardá el trabajo.');
  },
  rechazarPresupuesto(el){
    confirmDialog('¿Marcar este presupuesto como rechazado?', () => {
      collectionRef('presupuestos').update(el.dataset.id, {estado:'rechazado', rechazadoFecha: todayISO()});
      toast('Presupuesto marcado como rechazado.');
    });
  },
  reabrirPresupuesto(el){ collectionRef('presupuestos').update(el.dataset.id, {estado:'enviado'}); toast('Presupuesto reabierto.'); },
  eliminarPresupuesto(el){
    confirmDialog('¿Eliminar este presupuesto? No se puede deshacer.', () => {
      markSaving();
      collectionRef('presupuestos').remove(el.dataset.id).then(() => { doneSaving(); toast('Presupuesto eliminado.'); }).catch(saveError);
    });
  },
  presupuestoDesdeOrden(el){
    const o = state.ordenes.find(x => x.id === el.dataset.id);
    if(!o) return;
    const c = state.clientes.find(x => x.id === o.clienteId) || {};
    state._presupuesto = Object.assign(blankPresupuesto(), {clienteId:o.clienteId, vehiculoId:o.vehiculoId, nombre:c.nombre||'', telefono:c.telefono||''});
    savePresupuestoDraft();
    goSection('presupuestos');
  }
});

(function loadPresupuestoDraft(){
  try{ const raw = localStorage.getItem(lsKey('presupuesto_borrador')); if(raw) state._presupuesto = Object.assign(blankPresupuesto(), JSON.parse(raw)); }catch(e){ /* sin borrador */ }
})();
