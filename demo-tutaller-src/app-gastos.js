'use strict';
/* ===================== GASTOS DE TALLER ===================== */
// Cargar gastos fijos (alquiler, luz, etc.) con fecha, descripción y monto, sumados por mes.
// Junto con los ingresos que salen de "Trabajos", esto responde "cuánto gana el taller" — uno de
// los puntos de "qué incluye" de la oferta ("gestión de gastos, ventas y comprobantes").

const MESES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function mesLabel(mesStr){
  const [y, m] = mesStr.split('-').map(Number);
  return `${MESES_LARGO[m-1]} ${y}`;
}
function shiftMes(mesStr, delta){
  const [y, m] = mesStr.split('-').map(Number);
  const d = new Date(y, m-1+delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function gastosDelMes(mesStr){
  return state.gastos.filter(g => (g.fecha||'').slice(0,7) === mesStr).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
}
function totalGastosMes(mesStr){
  return gastosDelMes(mesStr).reduce((s,g)=>s+(g.monto||0), 0);
}
function trabajosDelMes(mesStr){
  return state.trabajos.filter(t => (t.fecha||'').slice(0,7) === mesStr);
}
function totalIngresosMes(mesStr){
  return trabajosDelMes(mesStr).reduce((s,t)=>s+(t.total||0), 0);
}

function renderGastos(){
  const mes = state.gastosMes;
  const lista = gastosDelMes(mes);
  const total = totalGastosMes(mes);
  const ingresos = totalIngresosMes(mes);
  const neto = ingresos - total;
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Gastos de taller</h1>
      <button class="btn btn-primary" data-action="nuevoGasto">+ Nuevo gasto</button>
    </div>

    <div class="filters-row" style="align-items:center;">
      <button class="btn btn-sm" data-action="mesGastosAnterior">‹</button>
      <div style="font-weight:700; text-transform:capitalize; min-width:160px; text-align:center;">${esc(mesLabel(mes))}</div>
      <button class="btn btn-sm" data-action="mesGastosSiguiente">›</button>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr); margin-bottom:14px;">
      <div class="kpi-card"><div class="lbl">Ingresos del mes</div><div class="val" style="color:var(--green);">${money(ingresos)}</div><div class="sub">${trabajosDelMes(mes).length} trabajo${trabajosDelMes(mes).length===1?'':'s'} facturado${trabajosDelMes(mes).length===1?'':'s'}</div></div>
      <div class="kpi-card"><div class="lbl">Gastos del mes</div><div class="val" style="color:var(--red-600);">${money(total)}</div><div class="sub">${lista.length} gasto${lista.length===1?'':'s'} cargado${lista.length===1?'':'s'}</div></div>
      <div class="kpi-card accent"><div class="lbl">Neto</div><div class="val">${money(neto)}</div><div class="sub">Ingresos − gastos</div></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>Fecha</th><th>Descripción</th><th style="text-align:right;">Monto</th><th></th></tr></thead>
        <tbody>
          ${lista.length ? lista.map(g => `
            <tr>
              <td>${fmtDate(g.fecha)}</td>
              <td><b>${esc(g.descripcion)}</b></td>
              <td style="text-align:right;">${money(g.monto)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm btn-icon" data-action="editarGasto" data-id="${g.id}" title="Editar">✏️</button>
                <button class="btn btn-sm btn-icon" data-action="eliminarGasto" data-id="${g.id}" title="Eliminar">🗑️</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="4" class="empty">Sin gastos cargados en ${esc(mesLabel(mes))}.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function gastoFormHtml(g){
  g = g || {};
  return `
    <div class="modal-head"><h2>${g.id?'Editar gasto':'Nuevo gasto'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <input type="hidden" id="gf_id" value="${g.id||''}">
    <div class="field"><label>Fecha</label><input id="gf_fecha" type="date" value="${esc(g.fecha||todayISO())}"></div>
    <div class="field"><label>Descripción</label><input id="gf_descripcion" value="${esc(g.descripcion||'')}" placeholder="Ej: Alquiler, Luz, Gas..."></div>
    <div class="field"><label>Monto</label><input id="gf_monto" type="number" step="0.01" value="${g.monto||''}" placeholder="0"></div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarGasto">Guardar</button>
    </div>`;
}

Object.assign(actions, {
  nuevoGasto(){ openModal(gastoFormHtml(null)); },
  editarGasto(el){ openModal(gastoFormHtml(state.gastos.find(x=>x.id===el.dataset.id))); },
  guardarGasto(){
    const id = document.getElementById('gf_id').value;
    const fecha = document.getElementById('gf_fecha').value || todayISO();
    const descripcion = document.getElementById('gf_descripcion').value.trim();
    const monto = parseFloat(document.getElementById('gf_monto').value) || 0;
    if(!descripcion){ toast('Falta la descripción.'); return; }
    if(monto <= 0){ toast('El monto tiene que ser mayor a cero.'); return; }
    const data = {fecha, descripcion, monto};
    closeModal(); markSaving();
    if(id){
      collectionRef('gastos').update(id, data).then(doneSaving).catch(saveError);
    } else {
      data.createdAt = Date.now();
      collectionRef('gastos').add(data).then(doneSaving).catch(saveError);
    }
    state.gastosMes = fecha.slice(0,7);
    toast('Gasto guardado.');
  },
  eliminarGasto(el){
    const g = state.gastos.find(x=>x.id===el.dataset.id);
    if(!g) return;
    confirmDialog(`¿Eliminar el gasto "${g.descripcion}" de ${money(g.monto)}?`, () => {
      markSaving();
      collectionRef('gastos').remove(g.id).then(doneSaving).catch(saveError);
      toast('Gasto eliminado.');
    });
  },
  mesGastosAnterior(){ state.gastosMes = shiftMes(state.gastosMes, -1); renderGastos(); },
  mesGastosSiguiente(){ state.gastosMes = shiftMes(state.gastosMes, 1); renderGastos(); }
});
