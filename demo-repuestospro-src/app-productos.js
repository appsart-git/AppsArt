'use strict';
/* ===================== PRODUCTOS ===================== */

function productosFiltrados(){
  const q = (state.filtro.productos||'').toLowerCase().trim();
  let list = state.productos.slice().sort((a,b)=>(a.descripcion||'').localeCompare(b.descripcion||''));
  if(!q) return list;
  return list.filter(p => [p.codigoInterno,p.codigoProveedor,p.descripcion,p.rubro,p.compatibilidad]
    .some(v => (v||'').toLowerCase().includes(q)));
}

function renderProductos(){
  const list = productosFiltrados();
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Productos</h1>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <div class="searchbar"><span class="ico">🔎</span><input placeholder="Buscar por código, descripción, rubro…" data-input="filtroProductos" value="${esc(state.filtro.productos)}"></div>
        <button class="btn btn-primary" data-action="nuevoProducto">+ Nuevo producto</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Código</th><th>Descripción</th><th>Rubro</th><th>Compatibilidad</th><th>Stock</th><th>Precio venta</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map(p => `
            <tr>
              <td><b>${esc(p.codigoInterno)}</b>${p.codigoProveedor?`<div class="muted" style="font-size:11.5px;">Prov: ${esc(p.codigoProveedor)}</div>`:''}</td>
              <td>${esc(p.descripcion)}</td>
              <td>${esc(p.rubro||'')}</td>
              <td class="muted">${esc(p.compatibilidad||'—')}</td>
              <td>${stockPill(p)}</td>
              <td>${money(p.precioVenta)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm btn-icon" data-action="editarProducto" data-id="${p.id}" title="Editar">✏️</button>
                <button class="btn btn-sm btn-icon btn-danger" data-action="eliminarProducto" data-id="${p.id}" title="Eliminar">🗑️</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="7" class="empty">No hay productos cargados todavía.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function stockPill(p){
  const stock = Number(p.stock)||0, min = Number(p.stockMinimo)||0;
  if(stock <= 0) return `<span class="pill pill-bad">Sin stock</span>`;
  if(stock <= min) return `<span class="pill pill-warn">${stock} (bajo)</span>`;
  return `<span class="pill pill-ok">${stock}</span>`;
}

function productoFormHtml(p){
  p = p || {};
  return `
    <div class="modal-head"><h2>${p.id?'Editar':'Nuevo'} producto</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <input type="hidden" id="pf_id" value="${p.id||''}">
    <div class="row2">
      <div class="field"><label>Código interno</label><input id="pf_codigoInterno" value="${esc(p.codigoInterno || padCodigo(nextNumero('producto')))}" ${p.id?'':'readonly'}></div>
      <div class="field"><label>Código de proveedor/fabricante</label><input id="pf_codigoProveedor" value="${esc(p.codigoProveedor||'')}"></div>
    </div>
    <div class="field"><label>Descripción</label><input id="pf_descripcion" value="${esc(p.descripcion||'')}" placeholder="Ej: Filtro de aceite Fiat Cronos 1.3"></div>
    <div class="row2">
      <div class="field"><label>Rubro</label>
        <select id="pf_rubro">${RUBROS.map(r=>`<option ${p.rubro===r?'selected':''}>${r}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Compatibilidad (marca/modelo/año)</label><input id="pf_compatibilidad" value="${esc(p.compatibilidad||'')}" placeholder="Ej: Fiat Cronos/Argo 2018-2023"></div>
    </div>
    <div class="row3">
      <div class="field"><label>Stock actual</label><input id="pf_stock" type="number" step="1" value="${p.stock ?? 0}"></div>
      <div class="field"><label>Stock mínimo</label><input id="pf_stockMinimo" type="number" step="1" value="${p.stockMinimo ?? 1}"></div>
      <div class="field"><label>Ubicación</label><input id="pf_ubicacion" value="${esc(p.ubicacion||'')}" placeholder="Estante A3"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Costo (última compra)</label><input id="pf_costoUltimo" type="number" step="0.01" value="${p.costoUltimo ?? 0}"></div>
      <div class="field"><label>Precio de venta</label><input id="pf_precioVenta" type="number" step="0.01" value="${p.precioVenta ?? 0}"></div>
    </div>
    <div class="field"><label>Proveedor habitual</label>
      <select id="pf_proveedorHabitualId">
        <option value="">— Sin asignar —</option>
        ${state.proveedores.map(pr=>`<option value="${pr.id}" ${p.proveedorHabitualId===pr.id?'selected':''}>${esc(pr.nombre)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarProducto">Guardar</button>
    </div>`;
}

Object.assign(actions, {
  nuevoProducto(){ openModal(productoFormHtml(null)); },
  editarProducto(el){ openModal(productoFormHtml(findProducto(el.dataset.id))); },
  eliminarProducto(el){
    const p = findProducto(el.dataset.id);
    confirmDialog(`¿Eliminar "${p.descripcion}"? Esta acción no borra el historial de ventas/compras ya cargado.`, () => {
      markSaving();
      collectionRef('productos').update(p.id, {activo:false, stock:0}).then(doneSaving).catch(saveError);
      toast('Producto eliminado (dado de baja).');
    });
  },
  guardarProducto(){
    const id = document.getElementById('pf_id').value;
    const data = {
      codigoInterno: document.getElementById('pf_codigoInterno').value.trim(),
      codigoProveedor: document.getElementById('pf_codigoProveedor').value.trim(),
      descripcion: document.getElementById('pf_descripcion').value.trim(),
      rubro: document.getElementById('pf_rubro').value,
      compatibilidad: document.getElementById('pf_compatibilidad').value.trim(),
      stock: Number(document.getElementById('pf_stock').value)||0,
      stockMinimo: Number(document.getElementById('pf_stockMinimo').value)||0,
      ubicacion: document.getElementById('pf_ubicacion').value.trim(),
      costoUltimo: Number(document.getElementById('pf_costoUltimo').value)||0,
      precioVenta: Number(document.getElementById('pf_precioVenta').value)||0,
      proveedorHabitualId: document.getElementById('pf_proveedorHabitualId').value || null,
      activo: true
    };
    if(!data.descripcion){ toast('Falta la descripción del producto.'); return; }
    closeModal(); markSaving();
    if(id){
      collectionRef('productos').update(id, data).then(doneSaving).catch(saveError);
    } else {
      data.createdAt = Date.now();
      collectionRef('productos').add(data).then(doneSaving).catch(saveError);
      bumpCounter('producto');
    }
    toast('Producto guardado.');
  }
});

inputActions.filtroProductos = (el) => { state.filtro.productos = el.value; renderProductos(); };

/* Reusable searchable product picker used by Ventas/Compras carts */
function productoPickerHtml(inputId, resultsId, placeholder){
  return `<input id="${inputId}" placeholder="${esc(placeholder||'Buscar producto por código o descripción…')}" autocomplete="off">
    <div class="cart-search-results" id="${resultsId}" style="display:none;"></div>`;
}
function wireProductoPicker(inputId, resultsId, onPick){
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  if(!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if(!q){ results.style.display='none'; results.innerHTML=''; return; }
    const matches = state.productos.filter(p => p.activo!==false && [p.codigoInterno,p.codigoProveedor,p.descripcion].some(v=>(v||'').toLowerCase().includes(q))).slice(0,12);
    results.innerHTML = matches.length ? matches.map(p => `<div class="opt" data-pid="${p.id}"><b>${esc(p.codigoInterno)}</b> — ${esc(p.descripcion)} <span class="muted">(stock: ${p.stock}, ${money(p.precioVenta)})</span></div>`).join('') : `<div class="opt muted">Sin resultados. Se puede cargar como línea nueva.</div>`;
    results.style.display = 'block';
    Array.from(results.querySelectorAll('[data-pid]')).forEach(opt => {
      opt.addEventListener('click', () => {
        onPick(findProducto(opt.dataset.pid));
        input.value=''; results.style.display='none'; results.innerHTML='';
      });
    });
  });
}
