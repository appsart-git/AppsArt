'use strict';
/* ===================== STOCK DE REPUESTOS ===================== */
// Adaptado de Productos de Repuestos Pro, pensado para el depósito de un taller: qué repuestos hay,
// cuántos, dónde están y cuánto cuestan. Cada entrada/salida queda en `movimientosStock`, así se ve
// por qué cambió un número. El stock baja solo cuando se guarda un trabajo (Nuevo informe) con
// repuestos tomados del stock, y los presupuestos avisan si falta algo antes de aprobarlos.

const RUBROS_STOCK = ['Filtros','Lubricantes','Frenos','Encendido','Distribución','Suspensión','Embrague','Eléctrico','Refrigeración','Juntas y retenes','Otros'];

function findRepuesto(id){ return state.repuestos.find(r => r.id === id); }
function repuestosActivos(){ return state.repuestos.filter(r => r.activo !== false); }
function stockEstado(r){
  const stock = Number(r.stock)||0, min = Number(r.stockMinimo)||0;
  if(stock <= 0) return 'sin';
  if(stock <= min) return 'bajo';
  return 'ok';
}
function stockPill(r){
  const e = stockEstado(r), n = Number(r.stock)||0;
  if(e === 'sin') return `<span class="pill pill-red">Sin stock</span>`;
  if(e === 'bajo') return `<span class="pill pill-amber">${n} · bajo</span>`;
  return `<span class="pill pill-ok">${n}</span>`;
}
function siguienteCodigoRepuesto(){
  const max = state.repuestos.reduce((m,r) => Math.max(m, parseInt(String(r.codigo||'').replace(/\D/g,''),10)||0), 0);
  return 'R-' + String(max + 1).padStart(4,'0');
}
// Búsqueda sin tildes ni mayúsculas: "liquido" encuentra "Líquido de frenos".
function normTxt(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function repuestoCoincide(r, q){ return [r.codigo, r.descripcion, r.marca, r.rubro, r.compatibilidad, r.ubicacion].some(v => normTxt(v).includes(q)); }

function repuestosFiltrados(){
  const q = normTxt(state.filtroStock.query).trim();
  let list = repuestosActivos().sort((a,b)=>(a.descripcion||'').localeCompare(b.descripcion||''));
  if(state.filtroStock.tab === 'bajo') list = list.filter(r => stockEstado(r) !== 'ok');
  if(q) list = list.filter(r => repuestoCoincide(r, q));
  return list;
}

function renderStock(){
  const activos = repuestosActivos();
  const valorCosto = activos.reduce((s,r)=>s + (Number(r.stock)||0)*(Number(r.costo)||0), 0);
  const bajos = activos.filter(r => stockEstado(r) === 'bajo').length;
  const sin = activos.filter(r => stockEstado(r) === 'sin').length;
  const list = repuestosFiltrados();
  const tab = state.filtroStock.tab;
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Stock de repuestos</h1>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-ghost" data-action="pedidoReposicion">📋 Pedido de reposición</button>
        <button class="btn btn-primary" data-action="nuevoRepuesto">+ Nuevo repuesto</button>
      </div>
      <p class="lead">Lo que usás en un trabajo se descuenta solo al guardar el informe. Lo que entra, lo cargás con "Entrada".</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="lbl">Artículos</div><div class="val">${activos.length}</div><div class="sub">${activos.reduce((s,r)=>s+(Number(r.stock)||0),0)} unidades en depósito</div></div>
      <div class="kpi-card accent"><div class="lbl">Valor del stock</div><div class="val">${money(valorCosto)}</div><div class="sub">a precio de costo</div></div>
      <div class="kpi-card"><div class="lbl">Bajo el mínimo</div><div class="val" style="color:var(--amber);">${bajos}</div><div class="sub">conviene reponer</div></div>
      <div class="kpi-card"><div class="lbl">Sin stock</div><div class="val" style="color:var(--red-600);">${sin}</div><div class="sub">no se pueden usar hoy</div></div>
    </div>

    <div class="filters-row" style="align-items:center;">
      <div class="segmented">
        <button class="${tab==='todos'?'on':''}" data-action="stockTab" data-tab="todos">Todos (${activos.length})</button>
        <button class="${tab==='bajo'?'on':''}" data-action="stockTab" data-tab="bajo">Para reponer (${bajos+sin})</button>
      </div>
      <div class="searchbar"><span class="ico">🔎</span><input placeholder="Código, repuesto, marca, auto…" data-input="filtro_stock" value="${esc(state.filtroStock.query)}"></div>
    </div>

    <div class="table-wrap stock-table">
      <table>
        <thead><tr><th>Código</th><th>Repuesto</th><th>Compatible con</th><th>Stock</th><th style="text-align:right;">Costo</th><th style="text-align:right;">Venta</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(r => `
            <tr>
              <td style="white-space:nowrap;"><b>${esc(r.codigo)}</b></td>
              <td>${esc(r.descripcion)}<div class="muted small">${esc([r.marca, r.rubro, r.ubicacion && '📍 ' + r.ubicacion].filter(Boolean).join(' · '))}</div></td>
              <td class="muted">${esc(r.compatibilidad||'—')}</td>
              <td>${stockPill(r)}<div class="muted small">mín. ${Number(r.stockMinimo)||0}</div></td>
              <td style="text-align:right;">${money(r.costo)}</td>
              <td style="text-align:right;"><b>${money(r.precioVenta)}</b></td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm btn-ghost" data-action="movimientoStock" data-id="${r.id}" data-tipo="entrada" title="Entrada de mercadería">＋ Entrada</button>
                <button class="btn btn-sm btn-icon btn-ghost" data-action="verRepuesto" data-id="${r.id}" title="Ver y editar">✏️</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="7" class="empty">${tab==='bajo' ? 'Nada para reponer: todo está por encima del mínimo.' : 'No hay repuestos que coincidan con la búsqueda.'}</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="card-list stock-cards">
      ${list.length ? list.map(r => `
        <div class="row-card" data-action="verRepuesto" data-id="${r.id}" role="button" tabindex="0">
          <div class="top"><b>${esc(r.descripcion)}</b>${stockPill(r)}</div>
          <div class="meta">${esc(r.codigo)}${r.marca?' · '+esc(r.marca):''}${r.ubicacion?' · 📍 '+esc(r.ubicacion):''}</div>
          <div class="meta">${esc(r.compatibilidad||'')}</div>
          <div class="top" style="margin-top:8px; align-items:center;">
            <span class="small">Venta <b>${money(r.precioVenta)}</b> <span class="muted">· costo ${money(r.costo)}</span></span>
            <button class="btn btn-sm btn-ghost" data-action="movimientoStock" data-id="${r.id}" data-tipo="entrada">＋ Entrada</button>
          </div>
        </div>`).join('') : `<p class="empty">${tab==='bajo' ? 'Nada para reponer.' : 'No hay repuestos que coincidan.'}</p>`}
    </div>`;
}

/* ---------- alta / edición ---------- */
function repuestoFormHtml(r){
  r = r || {};
  return `
    <div class="modal-head"><h2>${r.id?'Editar':'Nuevo'} repuesto</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <input type="hidden" id="rf_id" value="${r.id||''}">
    <div class="row2">
      <div class="field"><label>Código</label><input id="rf_codigo" value="${esc(r.codigo || siguienteCodigoRepuesto())}"></div>
      <div class="field"><label>Rubro</label><select id="rf_rubro">${RUBROS_STOCK.map(x=>`<option ${r.rubro===x?'selected':''}>${x}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Descripción</label><input id="rf_descripcion" value="${esc(r.descripcion||'')}" placeholder="Ej: Filtro de aceite"></div>
    <div class="row2">
      <div class="field"><label>Marca</label><input id="rf_marca" value="${esc(r.marca||'')}" placeholder="Ej: Mann"></div>
      <div class="field"><label>Compatible con</label><input id="rf_compatibilidad" value="${esc(r.compatibilidad||'')}" placeholder="Ej: Fiat Cronos / Argo 1.3"></div>
    </div>
    <div class="row3">
      <div class="field"><label>${r.id?'Stock actual':'Stock inicial'}</label><input id="rf_stock" type="number" step="1" min="0" value="${r.stock ?? 0}" ${r.id?'readonly title="Para cambiarlo usá Entrada o Ajuste"':''}></div>
      <div class="field"><label>Stock mínimo</label><input id="rf_stockMinimo" type="number" step="1" min="0" value="${r.stockMinimo ?? 2}"></div>
      <div class="field"><label>Ubicación</label><input id="rf_ubicacion" value="${esc(r.ubicacion||'')}" placeholder="Estante A3"></div>
    </div>
    <div class="row3">
      <div class="field"><label>Costo ($)</label><input id="rf_costo" type="number" step="1" min="0" value="${r.costo ?? 0}" data-input="rf_costo"></div>
      <div class="field"><label>Margen (%)</label><input id="rf_margen" type="number" step="1" value="${r.costo ? Math.round(((r.precioVenta||0)/r.costo - 1)*100) : 40}" data-input="rf_margen"></div>
      <div class="field"><label>Precio de venta ($)</label><input id="rf_precioVenta" type="number" step="1" min="0" value="${r.precioVenta ?? 0}"></div>
    </div>
    <div class="field"><label>Proveedor habitual</label><input id="rf_proveedor" value="${esc(r.proveedor||'')}" placeholder="Ej: Distribuidora Sur"></div>
    ${r.id ? `<p class="small muted" style="margin-top:-4px;">El stock se modifica con <b>Entrada</b> (compra) o <b>Ajuste</b> (conteo), así queda registrado en el historial.</p>` : ''}
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarRepuesto">Guardar</button>
    </div>`;
}
inputActions.rf_costo = () => {
  const c = Number(document.getElementById('rf_costo').value)||0, m = Number(document.getElementById('rf_margen').value)||0;
  document.getElementById('rf_precioVenta').value = Math.round(c * (1 + m/100));
};
inputActions.rf_margen = inputActions.rf_costo;

/* ---------- ficha con historial de movimientos ---------- */
function movimientosDe(repuestoId){
  return state.movimientosStock.filter(m => m.repuestoId === repuestoId).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}
const MOV_LABEL = {entrada:'Entrada', salida:'Usado en trabajo', ajuste:'Ajuste', inicial:'Stock inicial'};
function repuestoDetailHtml(r){
  const movs = movimientosDe(r.id).slice(0, 12);
  return `
    <div class="modal-head"><h2>${esc(r.descripcion)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="row3" style="margin-bottom:14px;">
      <div><span class="muted small">Código</span><div><b>${esc(r.codigo)}</b></div></div>
      <div><span class="muted small">Stock</span><div>${stockPill(r)} <span class="muted small">mín. ${Number(r.stockMinimo)||0}</span></div></div>
      <div><span class="muted small">Precio de venta</span><div><b>${money(r.precioVenta)}</b> <span class="muted small">costo ${money(r.costo)}</span></div></div>
    </div>
    <p class="small muted" style="margin:0 0 14px;">${esc([r.marca, r.rubro, r.compatibilidad, r.ubicacion && '📍 '+r.ubicacion, r.proveedor && 'Prov.: '+r.proveedor].filter(Boolean).join(' · '))}</p>
    <h3 style="font-size:13.5px;">Movimientos</h3>
    <div class="table-wrap" style="margin-bottom:6px;">
      <table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th><th style="text-align:right;">Cant.</th></tr></thead>
        <tbody>${movs.length ? movs.map(m => `<tr><td>${fmtDate(m.fecha)}</td><td>${esc(MOV_LABEL[m.tipo]||m.tipo)}</td><td class="muted">${esc(m.detalle||'')}</td><td style="text-align:right; font-weight:700; color:${m.cantidad<0?'var(--red-600)':'var(--green)'};">${m.cantidad>0?'+':''}${m.cantidad}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">Sin movimientos todavía.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="modal-actions">
      <button class="btn-danger" data-action="eliminarRepuesto" data-id="${r.id}">Dar de baja</button>
      <button class="btn btn-ghost" data-action="editarRepuesto" data-id="${r.id}">✏️ Editar datos</button>
      <button class="btn btn-ghost" data-action="movimientoStock" data-id="${r.id}" data-tipo="ajuste">⚖️ Ajuste</button>
      <button class="btn btn-primary" data-action="movimientoStock" data-id="${r.id}" data-tipo="entrada">＋ Entrada</button>
    </div>`;
}

/* ---------- entrada de mercadería / ajuste por conteo ---------- */
function movimientoFormHtml(r, tipo){
  const entrada = tipo === 'entrada';
  return `
    <div class="modal-head"><h2>${entrada ? 'Entrada de mercadería' : 'Ajuste de stock'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <p style="margin:-6px 0 14px;"><b>${esc(r.descripcion)}</b> <span class="muted small">· hoy hay ${Number(r.stock)||0}</span></p>
    <input type="hidden" id="mv_id" value="${r.id}"><input type="hidden" id="mv_tipo" value="${tipo}">
    ${entrada ? `
      <div class="row2">
        <div class="field"><label>Cantidad que entra</label><input id="mv_cant" type="number" min="1" step="1" value="1" autofocus></div>
        <div class="field"><label>Costo unitario ($)</label><input id="mv_costo" type="number" min="0" step="1" value="${Number(r.costo)||0}"></div>
      </div>
      <div class="field"><label>Proveedor / remito</label><input id="mv_detalle" value="${esc(r.proveedor||'')}" placeholder="Ej: Distribuidora Sur · remito 0001-2231"></div>
      <p class="small muted" style="margin-top:-4px;">Si cambia el costo, el precio de venta se actualiza manteniendo el mismo margen.</p>`
    : `
      <div class="field"><label>Cantidad real contada</label><input id="mv_cant" type="number" min="0" step="1" value="${Number(r.stock)||0}" autofocus></div>
      <div class="field"><label>Motivo</label><input id="mv_detalle" placeholder="Ej: conteo de depósito, rotura, devolución"></div>`}
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarMovimiento">Guardar</button>
    </div>`;
}

/* ---------- pedido de reposición (lo bajo el mínimo, listo para mandar al proveedor) ---------- */
function textoPedidoReposicion(){
  const faltan = repuestosActivos().filter(r => stockEstado(r) !== 'ok').sort((a,b)=>(a.proveedor||'').localeCompare(b.proveedor||''));
  if(!faltan.length) return '';
  const lineas = faltan.map(r => {
    const pedir = Math.max(1, (Number(r.stockMinimo)||0) * 2 - (Number(r.stock)||0));
    return `• ${pedir} x ${r.descripcion}${r.marca?' '+r.marca:''}${r.compatibilidad?' ('+r.compatibilidad+')':''}`;
  });
  return `Hola! Te escribo de ${state.negocio.nombre}. Necesito el siguiente pedido:\n${lineas.join('\n')}\nGracias!`;
}

Object.assign(actions, {
  stockTab(el){ state.filtroStock.tab = el.dataset.tab; renderStock(); },
  nuevoRepuesto(){ openModal(repuestoFormHtml(null)); },
  verRepuesto(el){ const r = findRepuesto(el.dataset.id); if(r) openModal(repuestoDetailHtml(r), {wide:true}); },
  editarRepuesto(el){ openModal(repuestoFormHtml(findRepuesto(el.dataset.id))); },
  guardarRepuesto(){
    const id = document.getElementById('rf_id').value;
    const v = (k) => document.getElementById('rf_'+k).value;
    const data = {
      codigo: v('codigo').trim(), descripcion: v('descripcion').trim(), rubro: v('rubro'),
      marca: v('marca').trim(), compatibilidad: v('compatibilidad').trim(), ubicacion: v('ubicacion').trim(),
      stockMinimo: Number(v('stockMinimo'))||0, costo: Number(v('costo'))||0, precioVenta: Number(v('precioVenta'))||0,
      proveedor: v('proveedor').trim(), activo: true
    };
    if(!data.descripcion){ toast('Falta la descripción del repuesto.'); return; }
    closeModal(); markSaving();
    if(id){
      collectionRef('repuestos').update(id, data).then(doneSaving).catch(saveError);
    } else {
      data.stock = Math.max(0, Number(v('stock'))||0);
      data.createdAt = Date.now();
      collectionRef('repuestos').add(data).then(newId => {
        if(data.stock) collectionRef('movimientosStock').add({repuestoId:newId, tipo:'inicial', cantidad:data.stock, detalle:'Alta del repuesto', fecha:todayISO(), createdAt:Date.now()});
        doneSaving();
      }).catch(saveError);
    }
    toast('Repuesto guardado.');
  },
  eliminarRepuesto(el){
    const r = findRepuesto(el.dataset.id);
    confirmDialog(`¿Dar de baja "${r.descripcion}"? Deja de aparecer en el stock, pero los trabajos y presupuestos que ya lo usaron no cambian.`, () => {
      markSaving();
      collectionRef('repuestos').update(r.id, {activo:false}).then(doneSaving).catch(saveError);
      toast('Repuesto dado de baja.');
    });
  },
  movimientoStock(el, e){
    if(e) e.stopPropagation();
    const r = findRepuesto(el.dataset.id);
    if(r) openModal(movimientoFormHtml(r, el.dataset.tipo));
  },
  guardarMovimiento(){
    const r = findRepuesto(document.getElementById('mv_id').value);
    const tipo = document.getElementById('mv_tipo').value;
    const cant = Math.round(Number(document.getElementById('mv_cant').value));
    const detalle = document.getElementById('mv_detalle').value.trim();
    if(!r || isNaN(cant) || cant < 0 || (tipo==='entrada' && cant < 1)){ toast('Revisá la cantidad.'); return; }
    const actual = Number(r.stock)||0;
    const delta = tipo === 'entrada' ? cant : cant - actual;
    if(!delta){ closeModal(); toast('El stock ya estaba en ' + actual + '.'); return; }
    const patch = {stock: actual + delta};
    if(tipo === 'entrada'){
      const costo = Number(document.getElementById('mv_costo').value)||0;
      if(costo && costo !== r.costo){
        const margen = r.costo ? (r.precioVenta||0) / r.costo : 1.4;
        patch.costo = costo; patch.precioVenta = Math.round(costo * margen);
      }
    }
    closeModal(); markSaving();
    collectionRef('repuestos').update(r.id, patch)
      .then(() => collectionRef('movimientosStock').add({repuestoId:r.id, tipo, cantidad:delta, detalle, fecha:todayISO(), createdAt:Date.now()}))
      .then(doneSaving).catch(saveError);
    toast(`${r.descripcion}: stock ${actual} → ${actual + delta}.`);
  },
  pedidoReposicion(){
    const txt = textoPedidoReposicion();
    if(!txt){ toast('No hay nada bajo el mínimo para pedir.'); return; }
    openModal(`
      <div class="modal-head"><h2>Pedido de reposición</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
      <p class="small muted" style="margin-top:-6px;">Todo lo que está bajo el mínimo, con la cantidad para volver a tener stock holgado. Editalo si hace falta y mandalo al proveedor.</p>
      <div class="field"><textarea id="pedidoTxt" rows="10">${esc(txt)}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="copiarPedido">📋 Copiar</button>
        <button class="btn btn-wa" data-action="pedidoWhatsApp">💬 Enviar por WhatsApp</button>
      </div>`);
  },
  copiarPedido(){
    const t = document.getElementById('pedidoTxt').value;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Pedido copiado.')).catch(() => { document.getElementById('pedidoTxt').select(); toast('Seleccionado: copialo con Ctrl+C.'); });
  },
  pedidoWhatsApp(){
    window.open('https://wa.me/?text=' + encodeURIComponent(document.getElementById('pedidoTxt').value), '_blank', 'noopener');
  }
});
inputActions.filtro_stock = (el) => {
  state.filtroStock.query = el.value;
  renderStock();
  const inp = document.querySelector('[data-input="filtro_stock"]');
  if(inp){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
};

/* ---------- descuento automático al guardar un trabajo (llamado desde app-informe.js) ---------- */
async function descontarStockDeTrabajo(lineas, detalle){
  const usadas = lineas.filter(l => l.repuestoId && findRepuesto(l.repuestoId));
  for(const l of usadas){
    const r = findRepuesto(l.repuestoId);
    const cant = Math.max(1, Number(l.cantidad)||1);
    await collectionRef('repuestos').update(r.id, {stock: (Number(r.stock)||0) - cant});
    await collectionRef('movimientosStock').add({repuestoId:r.id, tipo:'salida', cantidad:-cant, detalle, fecha:todayISO(), createdAt:Date.now()});
  }
  return usadas.length;
}

/* ---------- buscador de repuestos del stock (reutilizado por Nuevo informe y Presupuestos) ---------- */
function stockPickerHtml(inputId, resultsId){
  return `<div class="stock-picker">
    <div class="searchbar"><span class="ico">📦</span><input id="${inputId}" placeholder="Agregar del stock: buscá por repuesto, código o auto…" autocomplete="off"></div>
    <div class="pick-results" id="${resultsId}" style="display:none;"></div>
  </div>`;
}
function wireStockPicker(inputId, resultsId, onPick){
  const input = document.getElementById(inputId), results = document.getElementById(resultsId);
  if(!input) return;
  input.addEventListener('input', () => {
    const q = normTxt(input.value).trim();
    if(!q){ results.style.display = 'none'; results.innerHTML = ''; return; }
    const matches = repuestosActivos().filter(r => repuestoCoincide(r, q)).slice(0, 10);
    results.innerHTML = matches.length ? matches.map(r => `
      <div class="opt" data-rid="${r.id}">
        <div><b>${esc(r.descripcion)}</b>${r.marca?' · '+esc(r.marca):''}<div class="muted small">${esc(r.codigo)}${r.compatibilidad?' · '+esc(r.compatibilidad):''}</div></div>
        <div style="text-align:right; white-space:nowrap;">${stockPill(r)}<div class="small"><b>${money(r.precioVenta)}</b></div></div>
      </div>`).join('') : `<div class="opt muted">No está en el stock. Cargalo como línea manual.</div>`;
    results.style.display = 'block';
    results.querySelectorAll('[data-rid]').forEach(opt => opt.addEventListener('click', () => {
      onPick(findRepuesto(opt.dataset.rid));
      input.value = ''; results.style.display = 'none'; results.innerHTML = '';
    }));
  });
}
