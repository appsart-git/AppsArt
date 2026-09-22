'use strict';
/* ===================== INICIO (dashboard) ===================== */
// Primera pantalla que ve el taller: el resumen que responde a la promesa de la campaña ("que tus
// clientes vuelvan solos") en números concretos, no en una lista de funciones.

function tasaRecompra(){
  const conTrabajos = state.clientes.filter(c => trabajosDeCliente(c.id).length > 0);
  if(!conTrabajos.length) return null;
  const repiten = conTrabajos.filter(c => trabajosDeCliente(c.id).length > 1).length;
  return Math.round((repiten / conTrabajos.length) * 100);
}

function manoObraFacturadaMes(mesStr){
  return trabajosDelMes(mesStr).reduce((s,t)=>s+(t.manoObra||0), 0);
}

/* ---------- gráfico de economía (mano de obra vs. gastos, últimos 6 meses) ---------- */
function ultimosMeses(n){
  const out = [];
  const now = new Date();
  for(let i=n-1; i>=0; i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const mesStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const nombre = MESES_LARGO[d.getMonth()];
    out.push({mesStr, label: nombre.charAt(0).toUpperCase()+nombre.slice(1,3)});
  }
  return out;
}
function roundedTopBarPath(x, y, w, h, r){
  if(h <= 0) return '';
  r = Math.min(r, h, w/2);
  return `M${x},${y+h} L${x},${y+r} Q${x},${y} ${x+r},${y} L${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h} Z`;
}
function economiaChartSvg(meses){
  const W = 600, H = 200, padL = 8, padR = 8, padTop = 16, chartBottom = 158, groupW = (W-padL-padR)/meses.length;
  const barW = Math.min(26, groupW/2 - 8), gap = 4;
  const maxVal = Math.max(1, ...meses.map(m=>Math.max(m.manoObra, m.gastos))) * 1.15;
  const scaleH = (v) => (v/maxVal) * (chartBottom-padTop);

  const bars = meses.map((m,i) => {
    const groupX = padL + i*groupW;
    const x1 = groupX + groupW/2 - gap/2 - barW;
    const x2 = groupX + groupW/2 + gap/2;
    const h1 = scaleH(m.manoObra), h2 = scaleH(m.gastos);
    const y1 = chartBottom - h1, y2 = chartBottom - h2;
    return `
      <path d="${roundedTopBarPath(x1,y1,barW,h1,4)}" fill="var(--green)"><title>${esc(m.label)} · Mano de obra: ${money(m.manoObra)}</title></path>
      <path d="${roundedTopBarPath(x2,y2,barW,h2,4)}" fill="var(--red-600)"><title>${esc(m.label)} · Gastos: ${money(m.gastos)}</title></path>
      <text x="${groupX+groupW/2}" y="${chartBottom+18}" text-anchor="middle" font-size="11" fill="var(--ink-600)" font-family="Inter,sans-serif">${esc(m.label)}</text>`;
  }).join('');

  return `
  <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;" role="img" aria-label="Mano de obra facturada y gastos por mes">
    <line x1="${padL}" y1="${chartBottom}" x2="${W-padR}" y2="${chartBottom}" stroke="var(--line)" stroke-width="1"/>
    ${bars}
  </svg>`;
}

function renderInicio(){
  const mesActual = todayISO().slice(0,7);
  const trabajosMesList = trabajosDelMes(mesActual);
  const manoObraMes = manoObraFacturadaMes(mesActual);
  const gastosMesList = gastosDelMes(mesActual);
  const gastosMesTotal = totalGastosMes(mesActual);
  const gananciaMensual = manoObraMes - gastosMesTotal;
  const recompra = tasaRecompra();
  const all = listaRecompra();
  const urgentes = all.filter(x => x.info.estado === 'vencido' || x.info.estado === 'porVencer')
    .sort((a,b)=>a.info.fecha.localeCompare(b.info.fecha)).slice(0,5);
  const autosEnTaller = state.ordenes.length;
  const meses6 = ultimosMeses(6).map(m => Object.assign({}, m, {
    manoObra: manoObraFacturadaMes(m.mesStr), gastos: totalGastosMes(m.mesStr)
  }));

  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Inicio</h1></div>

    <div class="promise-banner">
      <div class="txt">Ayudamos a que tus clientes <b>vuelvan solos</b>, con un sistema a medida funcionando en menos de 30 días, sin tener que llamar a nadie.</div>
      <button class="btn btn-primary" data-action="nav" data-id="fidelizacion">Ver quién tengo que contactar →</button>
    </div>

    <h3 class="kpi-section-lbl">Economía del taller — este mes</h3>
    <div class="kpi-grid-3">
      <div class="kpi-card"><div class="lbl">Facturado en mano de obra</div><div class="val" style="color:var(--green);">${money(manoObraMes)}</div><div class="sub">${trabajosMesList.length} trabajo${trabajosMesList.length===1?'':'s'} este mes</div></div>
      <div class="kpi-card"><div class="lbl">Gastos del mes</div><div class="val" style="color:var(--red-600);">${money(gastosMesTotal)}</div><div class="sub">${gastosMesList.length} gasto${gastosMesList.length===1?'':'s'} cargado${gastosMesList.length===1?'':'s'}</div></div>
      <div class="kpi-card accent"><div class="lbl">Ganancia mensual</div><div class="val">${money(gananciaMensual)}</div><div class="sub">Mano de obra − gastos fijos</div></div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <h2>Mano de obra vs. gastos <span class="small muted" style="font-weight:400; text-transform:none;">últimos 6 meses</span></h2>
      <div style="display:flex; gap:16px; margin-bottom:6px;">
        <span class="small" style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; border-radius:3px; background:var(--green); display:inline-block;"></span>Mano de obra</span>
        <span class="small" style="display:flex; align-items:center; gap:6px;"><span style="width:10px; height:10px; border-radius:3px; background:var(--red-600); display:inline-block;"></span>Gastos</span>
      </div>
      ${economiaChartSvg(meses6)}
    </div>

    <h3 class="kpi-section-lbl">Clientes y recompra</h3>
    <div class="kpi-grid-3">
      <div class="kpi-card"><div class="lbl">Clientes en la base</div><div class="val">${state.clientes.length}</div><div class="sub">${state.vehiculos.length} vehículo${state.vehiculos.length===1?'':'s'} registrado${state.vehiculos.length===1?'':'s'}</div></div>
      <div class="kpi-card"><div class="lbl">Tasa de recompra</div><div class="val">${recompra==null?'—':recompra+'%'}</div><div class="sub">clientes que volvieron más de una vez</div></div>
      <div class="kpi-card"><div class="lbl">Autos en el taller</div><div class="val">${autosEnTaller}</div><div class="sub">en seguimiento ahora</div></div>
    </div>

    <div class="panel">
      <h2>Para contactar esta semana <span class="pill pill-red">${urgentes.length}</span></h2>
      ${urgentes.length ? urgentes.map(recompraRowHtml).join('') : `<p class="empty-note">No hay nadie vencido ni por vencer — todo al día.</p>`}
      ${all.length > urgentes.length ? `<button class="btn btn-ghost btn-block" style="margin-top:8px;" data-action="nav" data-id="fidelizacion">Ver todos en Recompra →</button>` : ''}
    </div>`;
}
