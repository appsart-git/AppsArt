'use strict';
/* ===================== CUENTAS CORRIENTES / DEUDAS ===================== */

function renderCuentas(){
  const cobrar = state.clientes.filter(c => (Number(c.saldo)||0) > 0).sort((a,b)=>(Number(b.saldo)||0)-(Number(a.saldo)||0));
  const pagar = state.proveedores.filter(p => (Number(p.saldo)||0) > 0).sort((a,b)=>(Number(b.saldo)||0)-(Number(a.saldo)||0));
  const totalCobrar = cobrar.reduce((s,c)=>s+(Number(c.saldo)||0),0);
  const totalPagar = pagar.reduce((s,p)=>s+(Number(p.saldo)||0),0);
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Cuentas corrientes</h1></div>
    <div class="grid-cards">
      <div class="stat"><div class="label">Total por cobrar</div><div class="value bad">${money(totalCobrar)}</div></div>
      <div class="stat"><div class="label">Total por pagar</div><div class="value warn">${money(totalPagar)}</div></div>
    </div>
    <div class="tabs">
      <div class="tab ${state.cuentaTab==='cobrar'?'active':''}" data-action="cuentaTab" data-tab="cobrar">Por cobrar (clientes)</div>
      <div class="tab ${state.cuentaTab==='pagar'?'active':''}" data-action="cuentaTab" data-tab="pagar">Por pagar (proveedores)</div>
    </div>
    ${state.cuentaTab==='pagar' ? cuentaTabla(pagar,'proveedores') : cuentaTabla(cobrar,'clientes')}`;
}

function cuentaTabla(list, tipo){
  return `<div class="table-wrap">
    <table>
      <thead><tr><th>Nombre</th><th>Teléfono</th><th>Saldo</th><th></th></tr></thead>
      <tbody>
        ${list.length ? list.map(e => `
          <tr>
            <td><b>${esc(e.nombre)}</b></td>
            <td class="muted">${esc(e.telefono||'—')}</td>
            <td>${saldoPill(e.saldo)}</td>
            <td style="text-align:right;">
              <button class="btn btn-sm" data-action="verEntidad" data-tipo="${tipo}" data-id="${e.id}">Ver ficha</button>
              <button class="btn btn-sm btn-primary" data-action="registrarPago" data-tipo="${tipo}" data-id="${e.id}">Registrar pago</button>
            </td>
          </tr>`).join('') : `<tr><td colspan="4" class="empty">No hay saldos pendientes acá. 🎉</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

Object.assign(actions, {
  cuentaTab(el){ state.cuentaTab = el.dataset.tab; renderCuentas(); }
});
