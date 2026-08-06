'use strict';
/* ===================== HISTORIAL (solo lectura) ===================== */

function historialFiltrado(){
  return state.contenido.filter(c => {
    if(state.filtroHistorialCuenta!=='todas' && c.cuentaId!==state.filtroHistorialCuenta) return false;
    if(state.filtroHistorialEstado!=='todos' && (c.estado||'pendiente')!==state.filtroHistorialEstado) return false;
    return true;
  }).sort((a,b)=> new Date(b.generadoEn||0) - new Date(a.generadoEn||0));
}

function renderHistorial(){
  const items = historialFiltrado();
  const runs = state.runsLog.slice().sort((a,b)=> new Date(b.fecha||0) - new Date(a.fecha||0)).slice(0,10);

  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Historial</h1></div>

    ${runs.length>0 ? `
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;">Últimas corridas del generador</h3>
      <div class="table-wrap" style="border:none; margin-top:8px;">
        <table>
          <thead><tr><th>Fecha</th><th>Cuentas procesadas</th><th>OK</th><th>Con error</th></tr></thead>
          <tbody>
            ${runs.map(r => {
              const procesadas = r.cuentasProcesadas || [];
              const ok = procesadas.filter(p=>p.ok).length;
              const err = procesadas.length - ok;
              return `<tr>
                <td>${fmtDate(r.fecha)}</td>
                <td>${procesadas.length}</td>
                <td>${ok>0?`<span class="pill pill-ok">${ok}</span>`:'—'}</td>
                <td>${err>0?`<span class="pill pill-bad">${err}</span>`:'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="chiprow">
      <span class="chip ${state.filtroHistorialCuenta==='todas'?'active':''}" data-action="filtroHistCuenta" data-id="todas">Todas las cuentas</span>
      ${state.cuentas.map(c=>`<span class="chip ${state.filtroHistorialCuenta===c.id?'active':''}" data-action="filtroHistCuenta" data-id="${c.id}">${esc(c.nombre)}</span>`).join('')}
    </div>
    <div class="field" style="max-width:220px;">
      <select data-change="filtroHistEstado">
        <option value="todos" ${state.filtroHistorialEstado==='todos'?'selected':''}>Todos los estados</option>
        ${ESTADOS.map(e=>`<option value="${e.id}" ${state.filtroHistorialEstado===e.id?'selected':''}>${e.label}</option>`).join('')}
      </select>
    </div>

    ${items.length===0 ? `<div class="empty">No hay contenido para este filtro.</div>` : `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Tema</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${items.map(c => {
            const cuenta = findCuenta(c.cuentaId);
            return `<tr>
              <td>${c.generadoEn?fmtDate(c.generadoEn):'—'}</td>
              <td>${esc(cuenta?cuenta.nombre:'(eliminada)')}</td>
              <td>${c.tipo==='video'?'Video':'Imagen'}</td>
              <td>${esc(c.tema||'')}</td>
              <td>${pillEstado(c.estado||'pendiente')}</td>
              <td>${c.mediaUrl?`<a href="${esc(c.mediaUrl)}" target="_blank" rel="noopener">Ver</a>`:''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}
  `;
}

Object.assign(actions, {
  filtroHistCuenta(el){ state.filtroHistorialCuenta = el.dataset.id; render(); }
});
Object.assign(inputActions, {
  filtroHistEstado(el){ state.filtroHistorialEstado = el.value; render(); }
});
