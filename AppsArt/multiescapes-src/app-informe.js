'use strict';
/* ===================== NUEVO INFORME (formulario + preview + PDF/compartir + guardar trabajo) ===================== */
// Arma el mismo tipo de informe de una página que ya usa LYM Inyección, pero además guarda el
// trabajo en Firestore/local (colección `trabajos`, atada a `clienteId`+`vehiculoId`) para que
// quede buscable desde Clientes y Trabajos. La foto NO se guarda en la base (ver decisión en la
// spec) — solo se usa para armar el PDF/compartir de ese momento.

const CAR_MODELS = {
  "Volkswagen": ["Gol","Polo","Virtus","Vento","Nivus","Taos","Amarok","Suran","Fox","T-Cross","Saveiro","Golf","Voyage"],
  "Ford": ["Ka","Fiesta","Focus","EcoSport","Ranger","Territory","Mondeo"],
  "Chevrolet": ["Onix","Prisma","Cruze","Tracker","S10","Spin","Corsa","Celta","Astra"],
  "Fiat": ["Cronos","Argo","Mobi","Toro","Strada","Palio","Uno","Idea"],
  "Renault": ["Sandero","Logan","Duster","Kangoo","Clio","Kwid","Captur","Alaskan","Stepway","Fluence"],
  "Peugeot": ["208","2008","3008","Partner","408","308","Boxer"],
  "Toyota": ["Etios","Corolla","Hilux","SW4","Yaris","RAV4","Corolla Cross"],
  "Honda": ["Civic","Fit","HR-V","City","CR-V"],
  "Nissan": ["Versa","Kicks","Frontier","March","Sentra"],
  "Citroën": ["C3","C4 Cactus","Berlingo","C4"],
  "Jeep": ["Renegade","Compass"],
  "RAM": ["1500","700"],
  "Chery": ["Tiggo 2","Tiggo 3","Tiggo 7","Arrizo 5"],
  "Suzuki": ["Fun","Baleno"],
  "Mitsubishi": ["L200","Outlander","ASX"],
  "Hyundai": ["HB20","Creta","Tucson"],
  "Kia": ["Rio","Sportage","Cerato"],
  "BMW": ["Serie 1","Serie 3","X1"],
  "Mercedes-Benz": ["Clase A","Clase C","Sprinter"],
  "Audi": ["A3","Q3"]
};

function blankInforme(){
  return {
    photo: null,
    trabajos: [''],
    repuestos: [{nombre:'',marca:'',costo:0}],
    obs: [''],
    clienteId: null,
    vehiculoId: null,
    fields: {fecha: todayISO(), manoobra:'0'}
  };
}
if(!state.informe) state.informe = blankInforme();

/* ---------- ícono por tipo de repuesto (silenciador, sensor, abrazadera, genérico...) ---------- */
// Cada ícono trae su propio fondo circular (badge autocontenido) para leerse bien tanto en el
// fondo oscuro de .part-icon-preview como en el fondo claro de .r-part-icon en el reporte.
function iconBadge(inner){
  return `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#c8202b"/>${inner}</svg>`;
}
const ICONS = {
  escape: iconBadge('<rect x="4" y="10" width="11" height="4" rx="2" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M15 12h2.5l2.5-2.5M17.5 12L20 14.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none"/>'),
  sensor: iconBadge('<circle cx="12" cy="12" r="3.4" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>'),
  abrazadera: iconBadge('<circle cx="12" cy="12" r="6" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M12 6v2.4M18 12h-2.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>'),
  junta: iconBadge('<rect x="5.5" y="8.5" width="13" height="7" rx="2" stroke="#fff" stroke-width="1.5" fill="none"/><circle cx="9" cy="12" r="1" fill="#fff"/><circle cx="15" cy="12" r="1" fill="#fff"/>'),
  generic: iconBadge('<path d="M12 6a2.2 2.2 0 100 4.4A2.2 2.2 0 0012 6z" stroke="#fff" stroke-width="1.4" fill="none"/><path d="M12 3.6v1.8M12 18.6v1.8M20.4 12h-1.8M5.4 12H3.6M17.2 6.8l-1.3 1.3M8.1 15.9l-1.3 1.3M17.2 17.2l-1.3-1.3M8.1 8.1L6.8 6.8" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>')
};
function pickIcon(name){
  const n = (name||'').toLowerCase();
  if(/escape|silencio|caño|resonador|catalizador|colector/.test(n)) return ICONS.escape;
  if(/sensor|sonda|lambda|ox[íi]geno/.test(n)) return ICONS.sensor;
  if(/abrazadera|soporte|goma|buje/.test(n)) return ICONS.abrazadera;
  if(/junta|empaquetadura|reten/.test(n)) return ICONS.junta;
  return ICONS.generic;
}

/* ---------- helpers de campos ---------- */
function fV(id){ const el = document.getElementById('f_'+id); return el ? el.value : ''; }
function getMarcaValue(){
  const sel = fV('marca');
  return sel === 'Otra' ? fV('marca_otro') : sel;
}
function getModeloValue(){
  const sel = fV('modelo');
  return sel === 'Otro' ? fV('modelo_otro') : sel;
}
function populateMarcasList(selected){
  const sel = document.getElementById('f_marca');
  sel.innerHTML = `<option value="">Elegir...</option>` + Object.keys(CAR_MODELS).map(m=>`<option value="${m}">${m}</option>`).join('') + `<option value="Otra">Otra (escribir)</option>`;
  sel.value = selected || '';
}
function populateModelosList(marca, selected){
  const sel = document.getElementById('f_modelo');
  const models = CAR_MODELS[marca] || [];
  sel.innerHTML = `<option value="">Elegir...</option>` + models.map(m=>`<option value="${m}">${m}</option>`).join('') + `<option value="Otro">Otro (escribir)</option>`;
  sel.value = selected || '';
}
function populateAniosList(selected){
  const sel = document.getElementById('f_anio');
  const current = new Date().getFullYear() + 1;
  let opts = '<option value="">Elegir...</option>';
  for(let y = current; y >= 1990; y--) opts += `<option value="${y}">${y}</option>`;
  sel.innerHTML = opts;
  sel.value = selected || '';
}
function syncMarcaOtroVisibility(){ document.getElementById('f_marca_otro').style.display = fV('marca') === 'Otra' ? 'block' : 'none'; }
function syncModeloOtroVisibility(){ document.getElementById('f_modelo_otro').style.display = fV('modelo') === 'Otro' ? 'block' : 'none'; }

function vehiculoToFields(v){
  const f = {patente:v.patente||'', anio:v.anio||''};
  if(CAR_MODELS[v.marca]){ f.marca = v.marca; f.marca_otro=''; }
  else { f.marca = v.marca ? 'Otra' : ''; f.marca_otro = v.marca||''; }
  const modelos = CAR_MODELS[f.marca] || [];
  if(modelos.includes(v.modelo)){ f.modelo = v.modelo; f.modelo_otro=''; }
  else { f.modelo = v.modelo ? 'Otro' : ''; f.modelo_otro = v.modelo||''; }
  return f;
}

/* ---------- markup ---------- */
function informeMarkup(){
  const f = state.informe.fields;
  const clienteId = state.informe.clienteId;
  const cliente = clienteId ? state.clientes.find(x=>x.id===clienteId) : null;
  const vehiculosCliente = clienteId ? vehiculosDeCliente(clienteId) : [];

  return `
  <div class="section-head">
    <h1>Nuevo informe</h1>
    <button class="btn btn-ghost" data-action="nuevoInformeReset">＋ Nuevo informe</button>
  </div>
  <div class="layout">
    <div class="form-col">

      <div class="panel">
        <h2>Datos del vehículo</h2>
        <div class="field"><label>Fecha del trabajo</label><input id="f_fecha" type="date" data-field="fecha" value="${esc(f.fecha)}"></div>
        <div style="height:10px"></div>
        <div class="photo-drop" id="photoDrop">
          ${state.informe.photo
            ? `<img src="${state.informe.photo}">`
            : `<div class="hint" id="photoHint">📷 Foto del vehículo (opcional)</div>`}
          <input type="file" id="photoInput" accept="image/*" style="display:none;">
        </div>
        <div style="height:10px"></div>
        <div class="row2">
          <div class="field">
            <label>Marca</label>
            <select id="f_marca" data-change="informe_marca"></select>
            <input id="f_marca_otro" data-field="marca_otro" value="${esc(f.marca_otro||'')}" placeholder="Escribí la marca" style="display:none; margin-top:8px;">
          </div>
          <div class="field">
            <label>Modelo</label>
            <select id="f_modelo" data-change="informe_modelo"></select>
            <input id="f_modelo_otro" data-field="modelo_otro" value="${esc(f.modelo_otro||'')}" placeholder="Escribí el modelo" style="display:none; margin-top:8px;">
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>Año</label><select id="f_anio" data-change="informe_anio"></select></div>
          <div class="field"><label>Patente</label><input id="f_patente" data-field="patente" value="${esc(f.patente||'')}" placeholder="AD 361 KQ" style="text-transform:uppercase;"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Motor</label><input id="f_motor" data-field="motor" value="${esc(f.motor||'')}" placeholder="Ej: nafta 1.6"></div>
          <div class="field">
            <label>Transmisión</label>
            <select id="f_transmision" data-field="transmision">
              <option value="">Elegir...</option>
              <option${f.transmision==='Manual'?' selected':''}>Manual</option>
              <option${f.transmision==='Automática'?' selected':''}>Automática</option>
              <option${f.transmision==='Automática (CVT)'?' selected':''}>Automática (CVT)</option>
              <option${f.transmision==='Otra'?' selected':''}>Otra</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Kilometraje</label><input id="f_km" data-field="km" value="${esc(f.km||'')}" placeholder="Ej: 113.788 km"></div>
      </div>

      <div class="panel">
        <h2>Trabajos realizados</h2>
        <div id="trabajosList"></div>
        <button class="add-row-btn" id="addTrabajo">＋ Agregar trabajo</button>
      </div>

      <div class="panel">
        <h2>Repuestos utilizados</h2>
        <div id="repuestosList"></div>
        <button class="add-row-btn" id="addRepuesto">＋ Agregar repuesto</button>
      </div>

      <div class="panel">
        <h2>Mano de obra</h2>
        <div class="field"><label>Costo de mano de obra ($)</label><input id="f_manoobra" data-field="manoobra" type="number" value="${esc(f.manoobra||'0')}"></div>
      </div>

      <div class="panel">
        <h2>Cliente
          <button class="btn btn-sm btn-ghost" data-action="buscarClienteInforme">🔎 Buscar existente</button>
        </h2>
        ${cliente ? `<div class="pill pill-ok" style="margin-bottom:12px; display:inline-flex; align-items:center; gap:8px;">Vinculado a ${esc(cliente.nombre)} <button class="btn-danger" style="padding:1px 8px; font-size:11px;" data-action="desvincularClienteInforme">Quitar</button></div>` : ''}
        ${vehiculosCliente.length ? `
          <div class="field"><label>Vehículo del cliente</label>
            <select data-change="informe_vehiculo_select">
              <option value="">＋ Vehículo nuevo</option>
              ${vehiculosCliente.map(v=>`<option value="${v.id}"${state.informe.vehiculoId===v.id?' selected':''}>${esc(vehiculoLabel(v))}</option>`).join('')}
            </select>
          </div>` : ''}
        <div class="field"><label>Nombre del cliente</label><input id="f_responsable" data-field="responsable" value="${esc(f.responsable||'')}" placeholder="Nombre y apellido"></div>
        <div class="row2">
          <div class="field"><label>Teléfono</label><input id="f_telefono" data-field="telefono" value="${esc(f.telefono||'')}" placeholder="11 0000 0000"></div>
          <div class="field"><label>Dirección</label><input id="f_direccion" data-field="direccion" value="${esc(f.direccion||'')}" placeholder="Dirección del cliente"></div>
        </div>
      </div>

      <div class="panel">
        <h2>Observaciones</h2>
        <div id="obsList"></div>
        <button class="add-row-btn" id="addObs">＋ Agregar observación</button>
      </div>

      <div class="sticky-actions">
        <button class="btn btn-primary btn-block" id="guardarTrabajoBtn">💾 Guardar trabajo</button>
        <div class="btn-row">
          <button class="btn btn-ghost" id="downloadBtn">⬇ PDF</button>
          <button class="btn btn-share" id="shareBtn">📤 Compartir</button>
        </div>
        <div class="print-hint">Guardar trabajo lo suma al historial del cliente. El PDF sirve para enviarlo por WhatsApp.</div>
      </div>
    </div>

    <div class="preview-col">
      <div class="preview-wrap">
        <div id="report">
          <div class="r-header">
            <div class="r-header-photo" id="r_headerPhoto">
              <div class="placeholder">Foto del vehículo</div>
            </div>
            <div class="r-header-info">
              <div class="r-logo-strip"><img src="./logo-multiescapes.png"></div>
              <div class="r-eyebrow">Reporte de</div>
              <div class="r-title">Trabajo realizado</div>
              <div class="r-vehicle">
                <div>
                  <div class="r-vehicle-name" id="r_marca">Marca</div>
                  <div class="r-vehicle-model" id="r_modeloAnio">Modelo</div>
                </div>
              </div>
              <div class="r-specs" id="r_specs"></div>
            </div>
          </div>

          <div class="r-section">
            <div class="r-section-head"><div class="ic">🔧</div><h3>Trabajos realizados</h3></div>
            <ul class="r-trabajos" id="r_trabajos"></ul>
          </div>

          <div class="r-section" style="padding-top:0;">
            <div class="r-two-col">
              <div>
                <div class="r-section-head"><div class="ic">⚙️</div><h3>Repuestos utilizados</h3></div>
                <table class="r-parts-table">
                  <thead><tr><th>Repuesto</th><th>Marca</th><th style="text-align:right;">Costo</th></tr></thead>
                  <tbody id="r_repuestos"></tbody>
                </table>
              </div>
              <div>
                <div class="r-section-head green"><div class="ic">💲</div><h3>Resumen de costos</h3></div>
                <div class="r-cost-card">
                  <div class="r-cost-row"><span>Repuestos</span><b id="r_costRepuestos">$0</b></div>
                  <div class="r-cost-row"><span>Mano de obra</span><b id="r_costManoObra">$0</b></div>
                  <div class="r-cost-row total"><span>Total</span><b id="r_costTotal">$0</b></div>
                </div>
              </div>
            </div>
          </div>

          <div class="r-section" style="padding-top:0;">
            <div class="r-two-col">
              <div>
                <div class="r-section-head"><div class="ic">👤</div><h3>Datos del cliente</h3></div>
                <div class="r-info-card">
                  <div class="row"><span>👤</span><span id="r_responsable">—</span></div>
                  <div class="row"><span>📞</span><span id="r_telefono">—</span></div>
                  <div class="row"><span>📍</span><span id="r_direccion">—</span></div>
                </div>
              </div>
              <div>
                <div class="r-section-head red"><div class="ic">⚠️</div><h3>Observaciones</h3></div>
                <div class="r-info-card"><ul class="r-obs-list" id="r_obs"></ul></div>
              </div>
            </div>
          </div>

          <div class="r-footer">
            <b>SERVICIO REALIZADO CON EQUIPAMIENTO PROFESIONAL</b>
            <span>ESCAPES, SILENCIADORES Y CAÑERÍAS A MEDIDA</span>
            <span class="made-by">by AppsArt</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderInforme(){
  document.getElementById('main').innerHTML = informeMarkup();
  const f = state.informe.fields;
  populateMarcasList(f.marca);
  populateModelosList(f.marca === 'Otra' ? '' : f.marca, f.modelo);
  populateAniosList(f.anio);
  syncMarcaOtroVisibility();
  syncModeloOtroVisibility();

  document.querySelectorAll('[data-field]').forEach(el => {
    const handler = () => { state.informe.fields[el.dataset.field] = el.value; renderReport(); };
    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });

  renderTrabajosForm();
  renderRepuestosForm();
  renderObsForm();
  bindPhotoDrop();
  document.getElementById('addTrabajo').onclick = () => { state.informe.trabajos.push(''); renderTrabajosForm(); renderReport(); };
  document.getElementById('addRepuesto').onclick = () => { state.informe.repuestos.push({nombre:'',marca:'',costo:0}); renderRepuestosForm(); renderReport(); };
  document.getElementById('addObs').onclick = () => { state.informe.obs.push(''); renderObsForm(); renderReport(); };
  document.getElementById('downloadBtn').onclick = () => withBusyButton(document.getElementById('downloadBtn'), 'Generando…', async () => {
    try{ downloadBlob(await buildReportPdfBlob(), reportFileName()); }
    catch(e){ alert('No se pudo generar el PDF. Probá de nuevo.'); }
  });
  document.getElementById('shareBtn').onclick = () => withBusyButton(document.getElementById('shareBtn'), 'Generando…', async () => {
    try{
      const blob = await buildReportPdfBlob();
      const filename = reportFileName();
      const file = new File([blob], filename, {type:'application/pdf'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:'Informe Multiescapes', text:`Informe de ${getMarcaValue()||''} ${getModeloValue()||''}`.trim()});
      } else {
        downloadBlob(blob, filename);
      }
    }catch(e){ if(e && e.name==='AbortError') return; alert('No se pudo compartir el PDF. Probá de nuevo o usá "PDF".'); }
  });
  document.getElementById('guardarTrabajoBtn').onclick = () => guardarTrabajo();

  renderReport();
}

/* ---------- listas repetibles ---------- */
function renderTrabajosForm(){
  const wrap = document.getElementById('trabajosList');
  wrap.innerHTML = '';
  state.informe.trabajos.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-head"><span>Trabajo ${i+1}</span><button class="btn-danger" data-remove="${i}">Quitar</button></div>
      <textarea rows="2" data-i="${i}" placeholder="Describí el trabajo realizado">${esc(t)}</textarea>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { state.informe.trabajos.splice(+b.dataset.remove,1); renderTrabajosForm(); renderReport(); });
  wrap.querySelectorAll('textarea').forEach(el => el.oninput = () => { state.informe.trabajos[+el.dataset.i] = el.value; renderReport(); });
}
function renderRepuestosForm(){
  const wrap = document.getElementById('repuestosList');
  wrap.innerHTML = '';
  state.informe.repuestos.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-head"><span>Repuesto ${i+1}</span><button class="btn-danger" data-remove="${i}">Quitar</button></div>
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <div class="part-icon-preview" id="icon-prev-${i}"></div>
        <div style="flex:1;">
          <div class="field" style="margin-bottom:8px;"><input placeholder="Nombre del repuesto (ej: Silenciador trasero)" data-field="nombre" data-i="${i}" value="${esc(r.nombre||'')}"></div>
          <div class="row2">
            <div class="field" style="margin-bottom:0;"><input placeholder="Marca" data-field="marca" data-i="${i}" value="${esc(r.marca||'')}"></div>
            <div class="field" style="margin-bottom:0;"><input placeholder="Costo $" type="number" data-field="costo" data-i="${i}" value="${r.costo||''}"></div>
          </div>
        </div>
      </div>`;
    wrap.appendChild(card);
    document.getElementById(`icon-prev-${i}`).innerHTML = pickIcon(r.nombre);
  });
  wrap.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { state.informe.repuestos.splice(+b.dataset.remove,1); renderRepuestosForm(); renderReport(); });
  wrap.querySelectorAll('[data-field]').forEach(el => el.oninput = () => {
    const i = +el.dataset.i, field = el.dataset.field;
    state.informe.repuestos[i][field] = field === 'costo' ? (parseFloat(el.value)||0) : el.value;
    if(field === 'nombre'){ const iw = document.getElementById(`icon-prev-${i}`); if(iw) iw.innerHTML = pickIcon(el.value); }
    renderReport();
  });
}
function renderObsForm(){
  const wrap = document.getElementById('obsList');
  wrap.innerHTML = '';
  state.informe.obs.forEach((o, i) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-head"><span>Observación ${i+1}</span><button class="btn-danger" data-remove="${i}">Quitar</button></div>
      <textarea rows="2" data-i="${i}" placeholder="Ej: se recomienda revisar en 5.000 km">${esc(o)}</textarea>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { state.informe.obs.splice(+b.dataset.remove,1); renderObsForm(); renderReport(); });
  wrap.querySelectorAll('textarea').forEach(el => el.oninput = () => { state.informe.obs[+el.dataset.i] = el.value; renderReport(); });
}

/* ---------- foto ---------- */
function readAsDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}
function tryResizeDataUrl(dataUrl, maxDim, quality){
  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => { if(!done){ done = true; resolve(result); } };
    const safetyTimer = setTimeout(() => finish(dataUrl), 4000);
    const img = new Image();
    img.onload = () => {
      clearTimeout(safetyTimer);
      try{
        let {width, height} = img;
        if(!width || !height){ finish(dataUrl); return; }
        if(width > maxDim || height > maxDim){
          if(width >= height){ height = Math.round(height * (maxDim/width)); width = maxDim; }
          else { width = Math.round(width * (maxDim/height)); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const resized = canvas.toDataURL('image/jpeg', quality);
        finish(resized && resized.length > 100 ? resized : dataUrl);
      }catch(e){ finish(dataUrl); }
    };
    img.onerror = () => { clearTimeout(safetyTimer); finish(dataUrl); };
    img.src = dataUrl;
  });
}
async function loadImageFile(file, maxDim, quality){ return tryResizeDataUrl(await readAsDataURL(file), maxDim, quality); }
function bindPhotoDrop(){
  const drop = document.getElementById('photoDrop');
  const input = document.getElementById('photoInput');
  drop.onclick = () => input.click();
  input.onchange = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    try{
      state.informe.photo = await loadImageFile(file, 1000, 0.8);
      drop.innerHTML = `<img src="${state.informe.photo}">`;
      drop.onclick = () => input.click();
      renderReport();
    }catch(err){ alert('No se pudo cargar la foto. Probá con otra imagen.'); }
    e.target.value = '';
  };
}

/* ---------- preview del reporte ---------- */
function specRow(icon, label, value){
  return `<div class="r-spec"><div class="ic">${icon}</div><span class="lbl">${esc(label)}:</span> <b>${esc(value)}</b></div>`;
}
function formatFechaArg(iso){
  if(!iso) return '';
  const d = new Date(iso+'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('es-AR');
}
function renderReport(){
  const photoBox = document.getElementById('r_headerPhoto');
  photoBox.innerHTML = state.informe.photo
    ? `<div class="photo-bg" style="background-image:url('${state.informe.photo}')"></div>`
    : `<div class="placeholder">Foto del vehículo</div>`;

  const marca = getMarcaValue() || 'Marca';
  const modelo = getModeloValue() || 'Modelo';
  const anio = fV('anio') || '';
  document.getElementById('r_marca').textContent = marca;
  document.getElementById('r_modeloAnio').textContent = `${modelo} ${anio}`.trim();

  let specsHtml = '';
  if(fV('fecha')) specsHtml += specRow('📅', 'Fecha', formatFechaArg(fV('fecha')));
  if(fV('motor')) specsHtml += specRow('⚙️', 'Motor', fV('motor'));
  if(fV('transmision')) specsHtml += specRow('🔀', 'Transmisión', fV('transmision'));
  if(fV('km')) specsHtml += specRow('📊', 'Kilometraje', fV('km'));
  if(fV('patente')) specsHtml += specRow('🔖', 'Patente', fV('patente').toUpperCase());
  document.getElementById('r_specs').innerHTML = specsHtml;

  document.getElementById('r_trabajos').innerHTML = state.informe.trabajos.filter(t=>t&&t.trim()).map(t => `
    <li><span class="check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${esc(t)}</li>
  `).join('') || `<li class="empty-note" style="list-style:none;">Agregá los trabajos realizados desde el formulario.</li>`;

  let totalRepuestos = 0;
  document.getElementById('r_repuestos').innerHTML = state.informe.repuestos.filter(r=>r.nombre&&r.nombre.trim()).map(r => {
    totalRepuestos += (r.costo||0);
    return `<tr><td><div class="r-part-name"><div class="r-part-icon">${pickIcon(r.nombre)}</div><div class="r-part-desc"><b>${esc(r.nombre)}</b></div></div></td><td>${esc(r.marca||'—')}</td><td class="r-part-cost" style="text-align:right;">${money(r.costo)}</td></tr>`;
  }).join('') || `<tr><td colspan="3" class="empty-note">Agregá los repuestos utilizados.</td></tr>`;

  const manoObra = parseFloat(fV('manoobra'))||0;
  document.getElementById('r_costRepuestos').textContent = money(totalRepuestos);
  document.getElementById('r_costManoObra').textContent = money(manoObra);
  document.getElementById('r_costTotal').textContent = money(totalRepuestos+manoObra);

  document.getElementById('r_direccion').textContent = fV('direccion') || 'Sin especificar';
  document.getElementById('r_telefono').textContent = fV('telefono') || 'Sin especificar';
  document.getElementById('r_responsable').textContent = fV('responsable') || 'Sin especificar';

  document.getElementById('r_obs').innerHTML = state.informe.obs.filter(o=>o&&o.trim()).map(o=>`<li>${esc(o)}</li>`).join('') || `<li style="color:#9a938f;">Sin observaciones.</li>`;

  scalePreview();
  saveInformeDraft();
}
function scalePreview(){
  const report = document.getElementById('report');
  const wrap = report && report.parentElement;
  if(!report || !wrap) return;
  const PAD = 36; // preview-wrap tiene 18px de padding a cada lado
  const available = wrap.clientWidth - PAD;
  const scale = Math.min(1, available / 820);
  report.style.transform = `scale(${scale})`;
  wrap.style.height = (report.scrollHeight * scale + PAD) + 'px';
}
window.addEventListener('resize', () => { if(state.section==='informe') scalePreview(); });

/* ---------- PDF / compartir ---------- */
async function waitImagesReady(report){
  const imgs = Array.from(report.querySelectorAll('img'));
  await Promise.race([
    Promise.all(imgs.map(img => {
      if(img.complete && img.naturalWidth > 0) return img.decode ? img.decode().catch(()=>{}) : Promise.resolve();
      return new Promise(res => { img.onload = res; img.onerror = res; });
    })),
    new Promise(res => setTimeout(res, 2500))
  ]);
  // Dos rAF dejan que el navegador pinte antes de capturar. Si la pestaña está en segundo plano
  // (backgrounded) el navegador puede pausar rAF indefinidamente, así que esto también tiene un
  // límite de tiempo — nunca debe trabar la generación del PDF.
  await Promise.race([
    new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))),
    new Promise(res => setTimeout(res, 600))
  ]);
  await new Promise(res => setTimeout(res, 350));
}
function reportFileName(){
  return 'informe-multiescapes-' + (getModeloValue() || 'vehiculo').toLowerCase().replace(/[^a-z0-9]+/g,'-') + '.pdf';
}
async function buildReportPdfBlob(){
  const report = document.getElementById('report');
  await waitImagesReady(report);
  const prevTransform = report.style.transform, prevBoxShadow = report.style.boxShadow, prevBorderRadius = report.style.borderRadius;
  report.style.transform = 'none'; report.style.boxShadow = 'none'; report.style.borderRadius = '0';
  void report.offsetHeight;
  const reportH = report.scrollHeight;
  let canvas;
  try{
    canvas = await html2canvas(report, {scale:2, backgroundColor:'#f5f5f4', width:820, height:reportH, windowWidth:820});
  } finally {
    report.style.transform = prevTransform; report.style.boxShadow = prevBoxShadow; report.style.borderRadius = prevBorderRadius;
  }
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({unit:'px', format:[820, reportH], hotfixes:['px_scaling']});
  pdf.addImage(imgData, 'JPEG', 0, 0, 820, reportH);
  return pdf.output('blob');
}

/* ---------- guardar trabajo en la base (clientes + vehículos + trabajos) ---------- */
async function guardarTrabajo(){
  const nombre = fV('responsable').trim();
  if(!nombre){ toast('Falta el nombre del cliente.'); return; }
  markSaving();
  try{
    let clienteId = state.informe.clienteId;
    const clienteData = {nombre, telefono: fV('telefono').trim(), direccion: fV('direccion').trim()};
    if(clienteId){ await collectionRef('clientes').update(clienteId, clienteData); }
    else { clienteId = await collectionRef('clientes').add(Object.assign({createdAt:Date.now()}, clienteData)); state.informe.clienteId = clienteId; }

    let vehiculoId = state.informe.vehiculoId;
    const vehiculoData = {clienteId, patente: fV('patente').trim().toUpperCase(), marca: getMarcaValue(), modelo: getModeloValue(), anio: fV('anio')};
    if(vehiculoId){ await collectionRef('vehiculos').update(vehiculoId, vehiculoData); }
    else { vehiculoId = await collectionRef('vehiculos').add(Object.assign({createdAt:Date.now()}, vehiculoData)); state.informe.vehiculoId = vehiculoId; }

    const manoObra = parseFloat(fV('manoobra'))||0;
    const repuestos = state.informe.repuestos.filter(r=>r.nombre&&r.nombre.trim());
    const totalRepuestos = repuestos.reduce((s,r)=>s+(r.costo||0),0);
    const trabajoData = {
      clienteId, vehiculoId,
      fecha: fV('fecha') || todayISO(),
      trabajosRealizados: state.informe.trabajos.filter(t=>t&&t.trim()),
      repuestos,
      manoObra,
      observaciones: state.informe.obs.filter(o=>o&&o.trim()),
      total: totalRepuestos + manoObra,
      createdAt: Date.now()
    };
    await collectionRef('trabajos').add(trabajoData);
    doneSaving();
    toast('Trabajo guardado en el historial del cliente.');
  }catch(e){ saveError(e); }
}

/* ---------- vincular cliente existente desde el buscador ---------- */
Object.assign(actions, {
  buscarClienteInforme(){ state._buscadorClienteQuery=''; openModal(buscadorClienteHtml()); },
  elegirClienteInforme(el){
    const c = state.clientes.find(x=>x.id===el.dataset.id);
    if(!c) return;
    state.informe.clienteId = c.id;
    state.informe.fields.responsable = c.nombre||'';
    state.informe.fields.telefono = c.telefono||'';
    state.informe.fields.direccion = c.direccion||'';
    const vs = vehiculosDeCliente(c.id);
    if(vs.length === 1){
      state.informe.vehiculoId = vs[0].id;
      Object.assign(state.informe.fields, vehiculoToFields(vs[0]));
    } else {
      state.informe.vehiculoId = null;
    }
    closeModal();
    renderInforme();
    toast(`Cliente vinculado: ${c.nombre}`);
  },
  desvincularClienteInforme(){
    state.informe.clienteId = null;
    state.informe.vehiculoId = null;
    renderInforme();
  },
  nuevoInformeReset(){
    const dirty = state.informe.trabajos.some(t=>t&&t.trim()) || state.informe.repuestos.some(r=>r.nombre&&r.nombre.trim()) || state.informe.clienteId;
    const doReset = () => { state.informe = blankInforme(); renderInforme(); };
    if(dirty) confirmDialog('¿Empezar un informe nuevo? Se pierde lo que no guardaste.', doReset);
    else doReset();
  },
  cargarTrabajoEnInforme(el){
    const t = state.trabajos.find(x=>x.id===el.dataset.id);
    if(!t) return;
    const c = state.clientes.find(x=>x.id===t.clienteId);
    const v = state.vehiculos.find(x=>x.id===t.vehiculoId);
    const inf = blankInforme();
    inf.clienteId = t.clienteId || null;
    inf.vehiculoId = t.vehiculoId || null;
    inf.trabajos = (t.trabajosRealizados && t.trabajosRealizados.length) ? t.trabajosRealizados.slice() : [''];
    inf.repuestos = (t.repuestos && t.repuestos.length) ? t.repuestos.map(r=>Object.assign({},r)) : [{nombre:'',marca:'',costo:0}];
    inf.obs = (t.observaciones && t.observaciones.length) ? t.observaciones.slice() : [''];
    inf.fields.fecha = t.fecha || todayISO();
    inf.fields.manoobra = String(t.manoObra||0);
    if(c){ inf.fields.responsable = c.nombre||''; inf.fields.telefono = c.telefono||''; inf.fields.direccion = c.direccion||''; }
    if(v){ Object.assign(inf.fields, vehiculoToFields(v)); }
    state.informe = inf;
    closeModal();
    goSection('informe');
    toast('Informe recargado. La foto original no se guardó en la base — podés agregar una nueva si hace falta.');
  }
});
inputActions.informe_marca = (el) => {
  state.informe.fields.marca = el.value;
  populateModelosList(el.value === 'Otra' ? '' : el.value, '');
  state.informe.fields.modelo = '';
  syncMarcaOtroVisibility();
  syncModeloOtroVisibility();
  renderReport();
};
inputActions.informe_modelo = (el) => { state.informe.fields.modelo = el.value; syncModeloOtroVisibility(); renderReport(); };
inputActions.informe_anio = (el) => { state.informe.fields.anio = el.value; renderReport(); };
inputActions.informe_vehiculo_select = (el) => {
  if(!el.value){ state.informe.vehiculoId = null; renderInforme(); return; }
  const v = state.vehiculos.find(x=>x.id===el.value);
  if(!v) return;
  state.informe.vehiculoId = v.id;
  Object.assign(state.informe.fields, vehiculoToFields(v));
  renderInforme();
};

/* ---------- borrador local (independiente de la base — solo para no perder texto tipeado) ---------- */
function saveInformeDraft(){
  try{ localStorage.setItem(lsKey('informe_borrador'), JSON.stringify(state.informe)); }catch(e){ /* silencioso */ }
}
function loadInformeDraft(){
  try{
    const raw = localStorage.getItem(lsKey('informe_borrador'));
    if(raw) state.informe = Object.assign(blankInforme(), JSON.parse(raw));
  }catch(e){ /* sin borrador */ }
}
loadInformeDraft();
