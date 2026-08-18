'use strict';
/* ===================== CLIENTES / PROVEEDORES (entidad genérica) ===================== */
// tipo: 'clientes' | 'proveedores'

function entidadConfig(tipo){
  return tipo === 'clientes'
    ? {col:'clientes', pagoTipo:'cliente', movCol:'ventas', movLabel:'Ventas', saldoLabel:'Debe (a cobrar)', saldoSign:1}
    : {col:'proveedores', pagoTipo:'proveedor', movCol:'compras', movLabel:'Compras', saldoLabel:'Le debemos (a pagar)', saldoSign:1};
}

function entidadesFiltradas(tipo){
  const q = (state.filtro[tipo]||'').toLowerCase().trim();
  let list = state[tipo].slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  if(!q) return list;
  return list.filter(e => [e.nombre,e.telefono,e.direccion,e.contacto].some(v=>(v||'').toLowerCase().includes(q)));
}

function renderClientes(){ renderEntidadList('clientes'); }
function renderProveedores(){ renderEntidadList('proveedores'); }

function renderEntidadList(tipo){
  const cfg = entidadConfig(tipo);
  const list = entidadesFiltradas(tipo);
  const titulo = tipo === 'clientes' ? 'Clientes' : 'Proveedores';
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>${titulo}</h1>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <div class="searchbar"><span class="ico">🔎</span><input placeholder="Buscar por nombre o teléfono…" data-input="filtro_${tipo}" value="${esc(state.filtro[tipo])}"></div>
        <button class="btn btn-primary" data-action="nuevaEntidad" data-tipo="${tipo}">+ Nuevo ${tipo==='clientes'?'cliente':'proveedor'}</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Teléfono</th><th>${cfg.saldoLabel}</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(e => `
            <tr style="cursor:pointer;" data-action="verEntidad" data-tipo="${tipo}" data-id="${e.id}">
              <td><b>${esc(e.nombre)}</b></td>
              <td class="muted">${esc(e.telefono||'—')}</td>
              <td>${saldoPill(e.saldo)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm btn-icon" data-action="editarEntidad" data-tipo="${tipo}" data-id="${e.id}" title="Editar">✏️</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="4" class="empty">Todavía no hay ${tipo==='clientes'?'clientes':'proveedores'} cargados.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function saldoPill(saldo){
  saldo = Number(saldo)||0;
  if(saldo <= 0) return `<span class="pill pill-ok">${money(saldo)}</span>`;
  return `<span class="pill pill-bad">${money(saldo)}</span>`;
}

function entidadFormHtml(tipo, e){
  e = e || {};
  const cfg = entidadConfig(tipo);
  return `
    <div class="modal-head"><h2>${e.id?'Editar':'Nuevo'} ${tipo==='clientes'?'cliente':'proveedor'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <input type="hidden" id="ef_id" value="${e.id||''}">
    <input type="hidden" id="ef_tipo" value="${tipo}">
    <div class="field"><label>Nombre</label><input id="ef_nombre" value="${esc(e.nombre||'')}"></div>
    <div class="row2">
      <div class="field"><label>Teléfono (WhatsApp)</label><input id="ef_telefono" value="${esc(e.telefono||'')}" placeholder="Ej: 2914123456"></div>
      <div class="field"><label>${tipo==='clientes'?'Dirección':'Contacto'}</label><input id="ef_direccion" value="${esc(e.direccion||e.contacto||'')}"></div>
    </div>
    ${tipo==='proveedores' ? `<div class="field"><label>Condiciones de pago</label><input id="ef_condicionesPago" value="${esc(e.condicionesPago||'')}" placeholder="Ej: cuenta corriente a 30 días"></div>` : ''}
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarEntidad">Guardar</button>
    </div>`;
}

function entidadDetailHtml(tipo, id){
  const cfg = entidadConfig(tipo);
  const e = state[tipo].find(x=>x.id===id);
  if(!e) return '';
  const movs = state[cfg.movCol].filter(m => (tipo==='clientes' ? m.clienteId : m.proveedorId) === id).sort((a,b)=>b.createdAt-a.createdAt);
  const pagos = state.pagos.filter(p => p.tipo===cfg.pagoTipo && p.entidadId===id).sort((a,b)=>b.createdAt-a.createdAt);
  return `
    <div class="modal-head"><h2>${esc(e.nombre)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="row2">
      <div><span class="muted" style="font-size:12.5px;">Teléfono</span><div>${esc(e.telefono||'—')}</div></div>
      <div><span class="muted" style="font-size:12.5px;">${cfg.saldoLabel}</span><div style="font-size:18px; font-weight:800;">${saldoPill(e.saldo)}</div></div>
    </div>
    <div style="margin:16px 0 10px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn btn-primary btn-sm" data-action="registrarPago" data-tipo="${tipo}" data-id="${id}">+ Registrar pago</button>
      <button class="btn btn-sm" data-action="editarEntidad" data-tipo="${tipo}" data-id="${id}">Editar datos</button>
      ${tipo==='clientes' ? `<button class="btn btn-sm" data-action="verEstadoCuenta" data-id="${id}">📄 Estado de cuenta</button>` : ''}
    </div>
    <h3 style="font-size:14px; margin-top:16px;">${cfg.movLabel}</h3>
    <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
      <table><thead><tr><th>Fecha</th><th>Total</th><th>Forma de pago</th><th>Saldo generado</th><th>Estado</th></tr></thead>
      <tbody>${movs.length ? movs.map(m=>`<tr${m.anulada?' style="opacity:.55;"':''}><td>${fmtDate(m.createdAt)}</td><td>${money(m.total)}</td><td class="muted">${esc(m.formaPago)}</td><td>${money(m.saldoPendiente)}</td><td>${estadoMovPill(m)}</td></tr>`).join('') : `<tr><td colspan="5" class="empty">Sin movimientos</td></tr>`}</tbody></table>
    </div>
    <h3 style="font-size:14px; margin-top:16px;">Pagos registrados</h3>
    <div class="table-wrap" style="max-height:220px; overflow-y:auto;">
      <table><thead><tr><th>Fecha</th><th>Monto</th><th>Nota</th><th>Estado</th><th></th></tr></thead>
      <tbody>${pagos.length ? pagos.map(p=>`
        <tr${p.anulada?' style="opacity:.55;"':''}>
          <td>${fmtDate(p.createdAt)}</td>
          <td>${money(p.monto)}</td>
          <td class="muted">${esc(p.nota||'')}</td>
          <td>${estadoMovPill(p)}</td>
          <td style="text-align:right; white-space:nowrap;">
            ${!p.anulada ? `<button class="btn btn-sm" data-action="editarPago" data-tipo="${tipo}" data-id="${id}" data-pagoid="${p.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-action="anularPago" data-tipo="${tipo}" data-id="${id}" data-pagoid="${p.id}">Anular</button>` : ''}
          </td>
        </tr>`).join('') : `<tr><td colspan="5" class="empty">Sin pagos</td></tr>`}</tbody></table>
    </div>`;
}

function pagoFormHtml(tipo, id, pagoEditar){
  const e = state[tipo].find(x=>x.id===id);
  const editando = !!pagoEditar;
  return `
    <div class="modal-head"><h2>${editando?'Editar pago':'Registrar pago'} — ${esc(e.nombre)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <p class="muted" style="font-size:13px;">Saldo actual: <b>${money(e.saldo)}</b></p>
    <div class="field"><label>Monto</label><input id="pg_monto" type="number" step="0.01" value="${editando?pagoEditar.monto:Math.max(0,e.saldo||0)}"></div>
    <div class="field"><label>Nota (opcional)</label><input id="pg_nota" placeholder="Ej: transferencia, efectivo…" value="${editando?esc(pagoEditar.nota||''):''}"></div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      ${editando
        ? `<button class="btn btn-primary" data-action="guardarEdicionPago" data-tipo="${tipo}" data-id="${id}" data-pagoid="${pagoEditar.id}">Guardar cambios</button>`
        : `<button class="btn btn-primary" data-action="confirmarPago" data-tipo="${tipo}" data-id="${id}">Confirmar pago</button>`}
    </div>`;
}

Object.assign(actions, {
  nuevaEntidad(el){ openModal(entidadFormHtml(el.dataset.tipo, null)); },
  editarEntidad(el){ openModal(entidadFormHtml(el.dataset.tipo, state[el.dataset.tipo].find(x=>x.id===el.dataset.id))); },
  verEntidad(el){ openModal(entidadDetailHtml(el.dataset.tipo, el.dataset.id), {wide:true}); },
  guardarEntidad(){
    const tipo = document.getElementById('ef_tipo').value;
    const id = document.getElementById('ef_id').value;
    const nombre = document.getElementById('ef_nombre').value.trim();
    if(!nombre){ toast('Falta el nombre.'); return; }
    const data = {
      nombre,
      telefono: document.getElementById('ef_telefono').value.trim(),
      direccion: document.getElementById('ef_direccion').value.trim()
    };
    if(tipo==='proveedores') data.condicionesPago = document.getElementById('ef_condicionesPago').value.trim();
    closeModal(); markSaving();
    if(id){
      collectionRef(tipo).update(id, data).then(doneSaving).catch(saveError);
    } else {
      data.saldo = 0; data.createdAt = Date.now();
      collectionRef(tipo).add(data).then(doneSaving).catch(saveError);
    }
    toast('Guardado.');
  },
  registrarPago(el){ openModal(pagoFormHtml(el.dataset.tipo, el.dataset.id)); },
  confirmarPago(el){
    const tipo = el.dataset.tipo, id = el.dataset.id;
    const cfg = entidadConfig(tipo);
    const monto = Number(document.getElementById('pg_monto').value)||0;
    const nota = document.getElementById('pg_nota').value.trim();
    if(monto<=0){ toast('El monto tiene que ser mayor a cero.'); return; }
    const e = state[tipo].find(x=>x.id===id);
    closeModal(); markSaving();
    const b = newBatch();
    const pagoId = collectionRef('pagos').newId();
    b.set('pagos', pagoId, {tipo:cfg.pagoTipo, entidadId:id, monto, nota, anulada:false, createdAt:Date.now()});
    b.update(tipo, id, {saldo: (Number(e.saldo)||0) - monto});
    b.commit().then(doneSaving).catch(saveError);
    toast('Pago registrado.');
  },
  editarPago(el){
    const pago = state.pagos.find(p=>p.id===el.dataset.pagoid);
    if(!pago) return;
    openModal(pagoFormHtml(el.dataset.tipo, el.dataset.id, pago));
  },
  guardarEdicionPago(el){
    const tipo = el.dataset.tipo, id = el.dataset.id, pagoId = el.dataset.pagoid;
    const nuevoMonto = Number(document.getElementById('pg_monto').value)||0;
    const nota = document.getElementById('pg_nota').value.trim();
    if(nuevoMonto<=0){ toast('El monto tiene que ser mayor a cero.'); return; }
    const pago = state.pagos.find(p=>p.id===pagoId);
    const e = state[tipo].find(x=>x.id===id);
    if(!pago || !e) return;
    // El pago restó "monto" del saldo al registrarse; si el monto cambia, hay que ajustar
    // el saldo por la diferencia (delta) para que quede exactamente como si siempre hubiera
    // sido el monto nuevo.
    const delta = nuevoMonto - Number(pago.monto);
    closeModal(); markSaving();
    const b = newBatch();
    b.update('pagos', pagoId, {monto:nuevoMonto, nota, editadoAt:Date.now()});
    b.update(tipo, id, {saldo:(Number(e.saldo)||0) - delta});
    b.commit().then(doneSaving).catch(saveError);
    toast('Pago actualizado.');
  },
  anularPago(el){
    const tipo = el.dataset.tipo, id = el.dataset.id, pagoId = el.dataset.pagoid;
    confirmDialog('¿Anular este pago? El monto vuelve a sumarse al saldo pendiente.', () => {
      const pago = state.pagos.find(p=>p.id===pagoId);
      const e = state[tipo].find(x=>x.id===id);
      if(!pago || !e) return;
      markSaving();
      const b = newBatch();
      b.update('pagos', pagoId, {anulada:true, anuladaAt:Date.now()});
      b.update(tipo, id, {saldo:(Number(e.saldo)||0) + Number(pago.monto)});
      b.commit().then(doneSaving).catch(saveError);
      toast('Pago anulado.');
    });
  }
});

inputActions.filtro_clientes = (el) => { state.filtro.clientes = el.value; renderClientes(); };
inputActions.filtro_proveedores = (el) => { state.filtro.proveedores = el.value; renderProveedores(); };
