'use strict';
/* ===================== INGRESO: checklist del vehículo al entrar al taller ===================== */
// Cada auto que entra queda registrado con kilometraje, combustible,
// daños marcados en un plano del auto, fotos de los 4 lados, elementos que deja el cliente, testigos
// del tablero y la firma del cliente. Con eso se arma un "Acta de ingreso" en PDF que se le manda al
// cliente por WhatsApp: si después reclama un golpe o un rayón, está la foto y su firma de ese día.
// Mientras el auto está en el taller el ingreso queda "En taller"; al terminar pasa a "Entregado" y
// precarga el Informe del trabajo con el cliente, el vehículo y el kilometraje.
//
// Fotos y firma se guardan dentro del ingreso (achicadas a ~900px) para poder rearmar el acta cuando
// haga falta. En la instalación real van a Firebase Storage; acá en la demo quedan en el navegador.

const FOTO_LADOS = [
  {id:'frente', label:'Frente'},
  {id:'trasera', label:'Trasera'},
  {id:'izq', label:'Lateral izquierdo'},
  {id:'der', label:'Lateral derecho'}
];
const COMBUSTIBLE = ['Reserva','1/4','1/2','3/4','Lleno'];
const TIPOS_DANIO = [
  {id:'rayon', label:'Rayón', letra:'R'},
  {id:'abolladura', label:'Abolladura', letra:'A'},
  {id:'roto', label:'Roto / falta', letra:'X'}
];
const ELEMENTOS = [
  {id:'auxilio', label:'Rueda de auxilio'},
  {id:'gato', label:'Gato y llave de rueda'},
  {id:'matafuego', label:'Matafuego'},
  {id:'balizas', label:'Balizas'},
  {id:'stereo', label:'Stereo / pantalla'},
  {id:'documentacion', label:'Cédula y seguro'},
  {id:'alfombras', label:'Alfombras'},
  {id:'tapa', label:'Tapa de combustible'}
];
const TESTIGOS = [
  {id:'motor', label:'Check engine'},
  {id:'aceite', label:'Presión de aceite'},
  {id:'bateria', label:'Batería'},
  {id:'temperatura', label:'Temperatura'},
  {id:'abs', label:'ABS'},
  {id:'airbag', label:'Airbag'}
];

/* ---------- plano del auto visto desde arriba (frente arriba) ---------- */
const ZONAS = [
  {id:'parag_del', label:'Paragolpes delantero', d:'M44 10 Q100 0 156 10 L162 34 L38 34 Z'},
  {id:'capot', label:'Capot', d:'M54 38 H146 V122 H54 Z', rx:8},
  {id:'guarda_del_izq', label:'Guardabarros del. izq.', d:'M24 44 Q26 38 50 38 V122 H24 Z'},
  {id:'guarda_del_der', label:'Guardabarros del. der.', d:'M176 44 Q174 38 150 38 V122 H176 Z'},
  {id:'parabrisas', label:'Parabrisas', d:'M58 126 H142 L136 156 H64 Z', vidrio:true},
  {id:'puerta_del_izq', label:'Puerta del. izq.', d:'M24 126 H50 V206 H24 Z'},
  {id:'puerta_del_der', label:'Puerta del. der.', d:'M150 126 H176 V206 H150 Z'},
  {id:'techo', label:'Techo', d:'M62 160 H138 V262 H62 Z'},
  {id:'puerta_tras_izq', label:'Puerta tras. izq.', d:'M24 210 H50 V286 H24 Z'},
  {id:'puerta_tras_der', label:'Puerta tras. der.', d:'M150 210 H176 V286 H150 Z'},
  {id:'luneta', label:'Luneta', d:'M64 266 H136 L142 292 H58 Z', vidrio:true},
  {id:'baul', label:'Baúl / portón', d:'M54 296 H146 V360 H54 Z'},
  {id:'guarda_tras_izq', label:'Guardabarros tras. izq.', d:'M24 290 H50 V360 H28 Q24 360 24 352 Z'},
  {id:'guarda_tras_der', label:'Guardabarros tras. der.', d:'M176 290 H150 V360 H172 Q176 360 176 352 Z'},
  {id:'parag_tras', label:'Paragolpes trasero', d:'M38 364 H162 L156 388 Q100 398 44 388 Z'},
  {id:'espejo_izq', label:'Espejo izq.', d:'M8 130 H22 V146 H8 Z'},
  {id:'espejo_der', label:'Espejo der.', d:'M178 130 H192 V146 H178 Z'}
];
function zonaLabel(id){ const z = ZONAS.find(z=>z.id===id); return z ? z.label : id; }
function tipoDanio(id){ return TIPOS_DANIO.find(t=>t.id===id) || TIPOS_DANIO[0]; }

function danioSvg(danios, opts){
  opts = opts || {};
  const p = opts.prefix || 'dz';
  danios = danios || {};
  const fillFor = (z) => {
    const t = danios[z.id];
    if(t === 'rayon') return `url(#${p}-rayon)`;
    if(t === 'abolladura') return `url(#${p}-abol)`;
    if(t === 'roto') return '#2a2a2a';
    return z.vidrio ? '#e4e3e0' : '#ffffff';
  };
  const centro = (d) => {
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    const xs = nums.filter((_,i)=>i%2===0), ys = nums.filter((_,i)=>i%2===1);
    return [(Math.min(...xs)+Math.max(...xs))/2, (Math.min(...ys)+Math.max(...ys))/2];
  };
  return `
  <svg class="danio-svg" viewBox="0 0 200 400" width="${opts.width||200}" style="display:block; max-width:100%; height:auto;" role="img" aria-label="Plano del vehículo con daños marcados">
    <defs>
      <pattern id="${p}-rayon" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="#141414" stroke-width="2.4"/>
      </pattern>
      <pattern id="${p}-abol" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="#fff"/><circle cx="3.5" cy="3.5" r="1.7" fill="#141414"/>
      </pattern>
    </defs>
    <rect x="10" y="58" width="12" height="46" rx="4" fill="#141414"/><rect x="178" y="58" width="12" height="46" rx="4" fill="#141414"/>
    <rect x="10" y="300" width="12" height="46" rx="4" fill="#141414"/><rect x="178" y="300" width="12" height="46" rx="4" fill="#141414"/>
    ${ZONAS.map(z => {
      const [cx, cy] = centro(z.d);
      const t = danios[z.id];
      return `<g class="${opts.interactive?'zona':''}" ${opts.interactive?`data-action="marcarZona" data-zona="${z.id}"`:''}>
        <path d="${z.d}" fill="${fillFor(z)}" stroke="#141414" stroke-width="1.6" stroke-linejoin="round"><title>${esc(z.label)}</title></path>
        ${t ? `<circle cx="${cx}" cy="${cy}" r="8.5" fill="#fff" stroke="#141414" stroke-width="1.5"/><text x="${cx}" y="${cy+3.6}" text-anchor="middle" font-size="10" font-weight="800" font-family="Inter,sans-serif" fill="#141414">${tipoDanio(t).letra}</text>` : ''}
      </g>`;
    }).join('')}
    <text x="100" y="-2" text-anchor="middle" font-size="9" fill="#777">FRENTE</text>
  </svg>`;
}

/* ---------- siluetas guía para las fotos (se ven en el hueco vacío y en ingresos de ejemplo) ---------- */
const GUIAS = {
  frente: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 120 80" fill="none" stroke="#141414" stroke-width="3" stroke-linejoin="round"><path d="M14 52 L20 30 Q24 20 36 20 H84 Q96 20 100 30 L106 52"/><rect x="8" y="50" width="104" height="16" rx="5"/><path d="M28 30 H92"/><circle cx="24" cy="58" r="4"/><circle cx="96" cy="58" r="4"/><path d="M48 58 H72"/><rect x="12" y="66" width="14" height="8" rx="2"/><rect x="94" y="66" width="14" height="8" rx="2"/></svg>',
  trasera: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 120 80" fill="none" stroke="#141414" stroke-width="3" stroke-linejoin="round"><path d="M14 52 L22 26 Q25 18 36 18 H84 Q95 18 98 26 L106 52"/><rect x="8" y="50" width="104" height="16" rx="5"/><rect x="30" y="24" width="60" height="16" rx="3"/><rect x="14" y="54" width="18" height="7" rx="2"/><rect x="88" y="54" width="18" height="7" rx="2"/><rect x="48" y="55" width="24" height="7"/><rect x="12" y="66" width="14" height="8" rx="2"/><rect x="94" y="66" width="14" height="8" rx="2"/></svg>',
  izq: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="140" viewBox="0 0 140 70" fill="none" stroke="#141414" stroke-width="3" stroke-linejoin="round"><path d="M6 48 V38 Q6 32 14 31 L38 28 L54 14 Q58 11 64 11 H94 Q100 11 104 15 L118 28 Q132 30 134 38 V48 Z"/><path d="M58 28 L66 16 H84 V28 Z M90 28 V16 H98 L110 28 Z"/><circle cx="34" cy="50" r="10"/><circle cx="110" cy="50" r="10"/><path d="M84 28 V48"/></svg>',
  der: '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="140" viewBox="0 0 140 70" fill="none" stroke="#141414" stroke-width="3" stroke-linejoin="round"><g transform="translate(140 0) scale(-1 1)"><path d="M6 48 V38 Q6 32 14 31 L38 28 L54 14 Q58 11 64 11 H94 Q100 11 104 15 L118 28 Q132 30 134 38 V48 Z"/><path d="M58 28 L66 16 H84 V28 Z M90 28 V16 H98 L110 28 Z"/><circle cx="34" cy="50" r="10"/><circle cx="110" cy="50" r="10"/><path d="M84 28 V48"/></g></svg>'
};
function guiaSrc(lado){ return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(GUIAS[lado] || GUIAS.frente); }

/* ---------- helpers ---------- */
function ingresoNumero(i){ return 'N° ' + String(i.numero||0).padStart(4,'0'); }
function siguienteNumeroIngreso(){ return state.ingresos.reduce((m,i)=>Math.max(m, i.numero||0), 0) + 1; }
function fmtFechaHora(ms){
  const d = new Date(ms);
  return d.toLocaleDateString('es-AR') + ' · ' + d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit', hourCycle:'h23'}) + ' hs';
}
function fmtKm(km){ const n = parseInt(String(km||'').replace(/\D/g,''),10); return isNaN(n) ? '—' : n.toLocaleString('es-AR') + ' km'; }
function ingresosEnTaller(){ return state.ingresos.filter(i => i.estado !== 'entregado').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); }
function ingresosEntregados(){ return state.ingresos.filter(i => i.estado === 'entregado').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); }

function aniosOptions(sel){
  let o = '';
  for(let y = new Date().getFullYear() + 1; y >= 1990; y--) o += '<option' + (String(sel)===String(y)?' selected':'') + '>' + y + '</option>';
  return o;
}
function marcaIngreso(d){ return d.marca === 'Otra' ? (d.marcaOtro||'').trim() : (d.marca||'').trim(); }
function modeloIngreso(d){ return (d.modelo === 'Otro' || d.marca === 'Otra') ? (d.modeloOtro||'').trim() : (d.modelo||'').trim(); }
function blankIngreso(){
  return {clienteId:null, vehiculoId:null, nombre:'', telefono:'', patente:'', marca:'', modelo:'', anio:'',
    km:'', combustible:null, danios:{}, danioFotos:{}, fotos:{}, extras:[], elementos:{auxilio:true, gato:true, documentacion:true, tapa:true},
    llaves:'1', testigos:{}, motivo:'', observaciones:'', firma:null, aclaracion:''};
}
function saveIngresoDraft(){ try{ localStorage.setItem(lsKey('ingreso_borrador'), JSON.stringify(state._ingreso)); }catch(e){ /* sin lugar: se pierde solo el borrador */ } }
function loadIngresoDraft(){
  try{ const raw = localStorage.getItem(lsKey('ingreso_borrador')); if(raw) return Object.assign(blankIngreso(), JSON.parse(raw)); }catch(e){}
  return null;
}
if(!state._ingreso) state._ingreso = loadIngresoDraft() || blankIngreso();
if(!state._ingresoTool) state._ingresoTool = 'rayon';
if(state._ingresoForm == null) state._ingresoForm = false;

/* ===================== LISTA DE INGRESOS ===================== */
function renderIngreso(){
  if(state._ingresoForm){ renderIngresoForm(); return; }
  const enTaller = ingresosEnTaller(), entregados = ingresosEntregados();
  const tab = state.filtroIngresos === 'entregados' ? 'entregados' : 'en_taller';
  const list = tab === 'entregados' ? entregados : enTaller;
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Ingreso de vehículos</h1></div>
    <div class="ingreso-hero">
      <p>Antes de tocar el auto: fotos de los 4 lados, daños marcados, kilometraje, combustible y la firma del cliente. El acta le llega por WhatsApp y queda guardada.</p>
      <button class="btn btn-primary btn-lg" data-action="nuevoIngreso">+ Nuevo ingreso</button>
    </div>
    <div class="segmented" style="margin-bottom:14px;">
      <button class="${tab==='en_taller'?'on':''}" data-action="ingresosTab" data-tab="en_taller">En el taller (${enTaller.length})</button>
      <button class="${tab==='entregados'?'on':''}" data-action="ingresosTab" data-tab="entregados">Entregados (${entregados.length})</button>
    </div>
    ${list.length ? list.map(ingresoCardHtml).join('') : `<p class="empty">${tab==='en_taller' ? 'No hay autos en el taller. Registrá uno con "+ Nuevo ingreso".' : 'Todavía no se entregó ningún auto.'}</p>`}`;
}

function ingresoCardHtml(i){
  const c = state.clientes.find(x=>x.id===i.clienteId);
  const v = state.vehiculos.find(x=>x.id===i.vehiculoId);
  const nDanios = Object.keys(i.danios||{}).length;
  const nFotos = FOTO_LADOS.filter(l => i.fotos && i.fotos[l.id]).length + (i.extras||[]).length + Object.keys(i.danioFotos||{}).length;
  const foto = i.fotos && (i.fotos.frente || i.fotos.izq || i.fotos.der || i.fotos.trasera);
  const enviado = state.contactos.some(x => x.tipo==='ingreso' && x.ingresoId===i.id);
  return `
    <div class="ingreso-card">
      <div class="thumb">${foto ? `<img src="${foto}" alt="">` : `<img src="${guiaSrc('izq')}" alt="" style="width:70%; height:auto; opacity:.45;">`}</div>
      <div>
        <div class="top">
          <div><b>${esc(v ? vehiculoLabel(v) : 'Vehículo')}</b><div class="muted small">${esc(c ? c.nombre : 'Cliente')} · ${ingresoNumero(i)}</div></div>
          <span class="pill ${i.estado==='entregado'?'pill-ok':'pill-dark'}">${i.estado==='entregado'?'Entregado':'En taller'}</span>
        </div>
        <div class="facts">
          <span>📅 ${fmtFechaHora(i.createdAt)}</span><span>${fmtKm(i.km)}</span>
          <span>⛽ ${i.combustible!=null ? COMBUSTIBLE[i.combustible] : '—'}</span>
          <span>${nDanios ? `${nDanios} daño${nDanios===1?'':'s'} marcado${nDanios===1?'':'s'}` : 'Sin daños marcados'}</span>
          <span>📷 ${nFotos} foto${nFotos===1?'':'s'}</span>
          ${i.firma ? '<span>✍️ Firmado</span>' : ''}
        </div>
        ${i.motivo ? `<div class="small" style="margin-top:6px;">Motivo: ${esc(i.motivo)}</div>` : ''}
        <div class="acts">
          <button class="btn btn-sm btn-primary" data-action="verActa" data-id="${i.id}">Ver acta</button>
          ${c && c.telefono ? `<a class="btn btn-sm btn-wa" href="${waLink(c.telefono, mensajeIngreso(i))}" target="_blank" rel="noopener" data-action="avisoIngresoEnviado" data-id="${i.id}">💬 ${enviado?'Reenviar':'Enviar'} por WhatsApp</a>` : ''}
          ${i.estado!=='entregado' ? `<button class="btn btn-sm btn-ghost" data-action="terminarIngreso" data-id="${i.id}">🧾 Hacer el informe</button>` : ''}
          ${i.trabajoId && state.trabajos.some(t=>t.id===i.trabajoId) ? `<button class="btn btn-sm btn-ghost" data-action="verTrabajo" data-id="${i.trabajoId}">🧾 Ver informe del trabajo</button>` : ''}
          <button class="btn-danger" data-action="eliminarIngreso" data-id="${i.id}">Eliminar</button>
        </div>
      </div>
    </div>`;
}

function mensajeIngreso(i){
  const c = state.clientes.find(x=>x.id===i.clienteId);
  const v = state.vehiculos.find(x=>x.id===i.vehiculoId);
  return fillTemplate(state.negocio.mensajeIngreso, {
    nombre: c ? (c.nombre||'').split(' ')[0] : '', vehiculo: v ? `${v.marca} ${v.modelo}`.trim() : 'vehículo',
    taller: state.negocio.nombre, fecha: new Date(i.createdAt).toLocaleDateString('es-AR'),
    km: fmtKm(i.km).replace(' km',''), combustible: i.combustible!=null ? COMBUSTIBLE[i.combustible].toLowerCase() : '—'
  });
}

/* ===================== FORMULARIO DE INGRESO ===================== */
function fotoSlotHtml(lado){
  const src = state._ingreso.fotos[lado.id];
  return `<div class="foto-slot ${src?'has':''}" data-action="tomarFoto" data-lado="${lado.id}" role="button" tabindex="0">
    ${src ? `<img class="ph" src="${src}" alt=""><span class="tag">${esc(lado.label)}</span><span class="ok">✓</span>`
          : `<img class="guide" src="${guiaSrc(lado.id)}" alt=""><span class="lbl">📷 ${esc(lado.label)}</span>`}
  </div>`;
}
function extrasHtml(){
  const ex = state._ingreso.extras || [];
  return ex.map((src, k) => `<div class="foto-slot has"><img class="ph" src="${src}" alt=""><span class="tag">Detalle ${k+1}</span>
    <button class="btn-danger" style="position:absolute; right:6px; top:6px; background:#fff; padding:2px 8px;" data-action="quitarExtra" data-k="${k}">✕</button></div>`).join('')
    + (ex.length < 4 ? `<div class="foto-slot" data-action="tomarFoto" data-lado="extra" role="button" tabindex="0"><span style="font-size:22px;">＋</span><span class="lbl">Otra foto</span></div>` : '');
}
function daniosListHtml(){
  const d = state._ingreso.danios;
  const ids = Object.keys(d);
  const fotos = state._ingreso.danioFotos || {};
  return ids.length ? `<ul class="danio-list">${ids.map(id => `<li style="align-items:center;">
      <span style="display:flex; align-items:center; gap:8px;">${fotos[id] ? `<img src="${fotos[id]}" alt="" style="width:44px; height:34px; object-fit:cover; border-radius:6px;">` : ''}<span>${esc(zonaLabel(id))}<br><b>${esc(tipoDanio(d[id]).label)}</b></span></span>
      <button class="btn btn-sm ${fotos[id]?'btn-ghost':'btn-primary'}" data-action="tomarFoto" data-lado="danio:${id}">📷 ${fotos[id]?'Cambiar':'Foto'}</button>
    </li>`).join('')}</ul><p class="small muted" style="margin:8px 0 0;">Sacale una foto de cerca a cada daño: sale en el acta con el nombre de la parte.</p>`
    : `<p class="small muted" style="margin:0;">Sin daños marcados. Elegí el tipo y tocá la parte del auto.</p>`;
}
function chkHtml(grupo, it, on, warn){
  return `<div class="chk ${on?'on':''} ${warn?'warn':''}" data-action="toggleChk" data-grupo="${grupo}" data-id="${it.id}" role="checkbox" aria-checked="${on}" tabindex="0"><span class="box">${on?'✓':''}</span>${esc(it.label)}</div>`;
}

function renderIngresoForm(){
  const d = state._ingreso;
  const cliente = d.clienteId ? state.clientes.find(x=>x.id===d.clienteId) : null;
  const vehiculosCliente = d.clienteId ? vehiculosDeCliente(d.clienteId) : [];
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Nuevo ingreso <span class="muted" style="font-size:13px; letter-spacing:.06em;">N° ${String(siguienteNumeroIngreso()).padStart(4,'0')}</span></h1>
      <button class="btn btn-ghost" data-action="cancelarIngreso">← Volver</button>
    </div>
    <div class="ingreso-form">

      <div class="panel">
        <h2><span class="ttl"><span class="step-num">1</span>Cliente y vehículo</span>
          ${cliente ? '' : '<button class="btn btn-sm btn-ghost" data-action="buscarClienteIngreso">🔎 Cliente existente</button>'}</h2>
        ${cliente ? `<div class="pill pill-ok" style="margin-bottom:12px; display:inline-flex; align-items:center; gap:8px;">${esc(cliente.nombre)} <button class="btn-danger" style="padding:1px 8px; font-size:11px;" data-action="quitarClienteIngreso">Cambiar</button></div>
          ${vehiculosCliente.length ? `<div class="field"><label>Vehículo</label><select data-change="ingreso_vehiculo_select">
            <option value="">＋ Vehículo nuevo</option>
            ${vehiculosCliente.map(v=>`<option value="${v.id}"${d.vehiculoId===v.id?' selected':''}>${esc(vehiculoLabel(v))}</option>`).join('')}
          </select></div>` : ''}`
        : `<div class="row2">
            <div class="field"><label>Nombre del cliente</label><input data-ing="nombre" value="${esc(d.nombre)}" placeholder="Nombre y apellido"></div>
            <div class="field"><label>WhatsApp</label><input data-ing="telefono" inputmode="tel" value="${esc(d.telefono)}" placeholder="Ej: 3402 512345"></div>
          </div>`}
        ${!d.vehiculoId ? `<div class="row2">
            <div class="field"><label>Patente</label><input data-ing="patente" value="${esc(d.patente)}" placeholder="AD 361 KQ" style="text-transform:uppercase;"></div>
            <div class="field"><label>Año</label><select data-change="ingreso_anio"><option value="">Elegir...</option>${aniosOptions(d.anio)}</select></div>
          </div>
          <div class="row2">
            <div class="field"><label>Marca</label>
              <select data-change="ingreso_marca"><option value="">Elegir...</option>${Object.keys(CAR_MODELS).map(m=>`<option${d.marca===m?' selected':''}>${m}</option>`).join('')}<option value="Otra"${d.marca==='Otra'?' selected':''}>Otra (escribir)</option></select>
              ${d.marca==='Otra' ? `<input data-ing="marcaOtro" value="${esc(d.marcaOtro||'')}" placeholder="Escribí la marca" style="margin-top:8px;">` : ''}
            </div>
            <div class="field"><label>Modelo</label>
              <select data-change="ingreso_modelo"><option value="">Elegir...</option>${(CAR_MODELS[d.marca]||[]).map(m=>`<option${d.modelo===m?' selected':''}>${m}</option>`).join('')}<option value="Otro"${d.modelo==='Otro'?' selected':''}>Otro (escribir)</option></select>
              ${d.modelo==='Otro' || d.marca==='Otra' ? `<input data-ing="modeloOtro" value="${esc(d.modeloOtro||'')}" placeholder="Escribí el modelo" style="margin-top:8px;">` : ''}
            </div>
          </div>` : ''}
        <div class="field" style="margin-bottom:0;"><label>Motivo de ingreso (lo que cuenta el cliente)</label><input data-ing="motivo" value="${esc(d.motivo)}" placeholder="Ej: ruido en el tren delantero al doblar"></div>
      </div>

      <div class="panel">
        <h2><span class="ttl"><span class="step-num">2</span>Kilometraje y combustible</span></h2>
        <div class="field"><label>Kilometraje del tablero</label><input data-ing="km" inputmode="numeric" value="${esc(d.km)}" placeholder="Ej: 87.450"></div>
        <label class="small muted" style="display:block; font-weight:600; text-transform:uppercase; letter-spacing:.06em; font-size:11.5px; margin-bottom:6px;">Nivel de combustible</label>
        <div class="fuel" id="fuelSel">${COMBUSTIBLE.map((c,k)=>`<button class="${d.combustible!=null && k<=d.combustible?'fill':''}" data-action="setCombustible" data-k="${k}">${c}</button>`).join('')}</div>
      </div>

      <div class="panel">
        <h2><span class="ttl"><span class="step-num">3</span>Fotos del vehículo</span><span class="small muted" style="text-transform:none; letter-spacing:0; font-weight:500;">cámara o galería</span></h2>
        <div class="foto-grid" id="fotoGrid">${FOTO_LADOS.map(fotoSlotHtml).join('')}</div>
        <div class="foto-grid" id="extrasGrid" style="margin-top:10px;">${extrasHtml()}</div>
        <input type="file" id="fotoInput" accept="image/*" style="display:none;">
      </div>

      <div class="panel">
        <h2><span class="ttl"><span class="step-num">4</span>Estado exterior</span></h2>
        <div class="danio-tools" id="danioTools">
          ${TIPOS_DANIO.map(t=>`<button class="danio-tool ${state._ingresoTool===t.id?'on':''}" data-action="setDanioTool" data-tool="${t.id}"><span class="sw" style="background:${t.id==='rayon'?'repeating-linear-gradient(45deg,#141414 0 2px,#fff 2px 5px)':t.id==='abolladura'?'radial-gradient(#141414 1.4px, #fff 1.6px) 0 0/6px 6px':'#2a2a2a'};"></span>${t.label}</button>`).join('')}
          <button class="danio-tool ${state._ingresoTool==='borrar'?'on':''}" data-action="setDanioTool" data-tool="borrar">Borrar</button>
        </div>
        <div class="danio-wrap">
          <div id="danioPlano">${danioSvg(d.danios, {interactive:true, prefix:'form'})}</div>
          <div id="danioList">${daniosListHtml()}</div>
        </div>
      </div>

      <div class="panel">
        <h2><span class="ttl"><span class="step-num">5</span>Qué queda en el auto</span></h2>
        <div class="chk-grid">${ELEMENTOS.map(it => chkHtml('elementos', it, !!d.elementos[it.id])).join('')}</div>
        <div class="field" style="max-width:200px; margin:12px 0 0;"><label>Juegos de llaves</label><input data-ing="llaves" inputmode="numeric" value="${esc(d.llaves)}"></div>
        <h3 style="font-size:12px; margin:18px 0 8px; color:var(--ink-600);">Testigos encendidos en el tablero</h3>
        <div class="chk-grid">${TESTIGOS.map(it => chkHtml('testigos', it, !!d.testigos[it.id], true)).join('')}</div>
        <div class="field" style="margin:14px 0 0;"><label>Observaciones</label><textarea rows="2" data-ing="observaciones" placeholder="Ej: deja objetos personales en la guantera, cubierta trasera gastada">${esc(d.observaciones)}</textarea></div>
      </div>

      <div class="panel">
        <h2><span class="ttl"><span class="step-num">6</span>Firma del cliente</span><button class="btn btn-sm btn-ghost" data-action="borrarFirma">Borrar</button></h2>
        <p class="small muted" style="margin-top:-4px;">El cliente confirma que el vehículo entra en el estado descripto.</p>
        <div class="firma-pad"><canvas id="firmaCanvas"></canvas><div class="ph-txt">Firma con el dedo</div></div>
        <div class="field" style="margin:12px 0 0;"><label>Aclaración</label><input data-ing="aclaracion" value="${esc(d.aclaracion || (cliente?cliente.nombre:d.nombre))}" placeholder="Nombre de quien firma"></div>
      </div>

      <div class="ingreso-actions">
        <button class="btn btn-ghost" data-action="cancelarIngreso">Cancelar</button>
        <button class="btn btn-primary btn-block" id="guardarIngresoBtn" data-action="guardarIngreso">Guardar y generar acta</button>
      </div>
    </div>`;
  bindFotoInput();
  bindFirmaPad();
}

/* ---------- fotos ---------- */
let _fotoLado = null;
function bindFotoInput(){
  const input = document.getElementById('fotoInput');
  if(!input) return;
  input.onchange = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    try{
      const src = await loadImageFile(file, 900, 0.62);
      if(_fotoLado.startsWith('danio:')){ state._ingreso.danioFotos = state._ingreso.danioFotos || {}; state._ingreso.danioFotos[_fotoLado.slice(6)] = src; document.getElementById('danioList').innerHTML = daniosListHtml(); }
      else if(_fotoLado === 'extra'){ state._ingreso.extras.push(src); document.getElementById('extrasGrid').innerHTML = extrasHtml(); }
      else { state._ingreso.fotos[_fotoLado] = src; document.getElementById('fotoGrid').innerHTML = FOTO_LADOS.map(fotoSlotHtml).join(''); }
      saveIngresoDraft();
    }catch(err){ toast('No se pudo cargar la foto. Probá de nuevo.'); }
    e.target.value = '';
  };
}

/* ---------- firma (canvas con el dedo o el mouse) ---------- */
function bindFirmaPad(){
  const canvas = document.getElementById('firmaCanvas');
  if(!canvas) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  const ph = canvas.parentElement.querySelector('.ph-txt');
  if(state._ingreso.firma){
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    img.src = state._ingreso.firma;
    if(ph) ph.style.display = 'none';
  }
  let drawing = false, last = null;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top}; };
  canvas.onpointerdown = (e) => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); if(ph) ph.style.display='none'; };
  canvas.onpointermove = (e) => {
    if(!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  };
  const end = () => { if(!drawing) return; drawing = false; state._ingreso.firma = canvas.toDataURL('image/png'); saveIngresoDraft(); };
  canvas.onpointerup = end; canvas.onpointercancel = end; canvas.onpointerleave = end;
}

/* ---------- guardar ---------- */
async function guardarIngreso(btn){
  const d = state._ingreso;
  if(!d.clienteId && !d.nombre.trim()){ toast('Falta el nombre del cliente.'); return; }
  if(!d.vehiculoId && !d.patente.trim() && !modeloIngreso(d)){ toast('Cargá al menos la patente o el modelo.'); return; }
  if(!d.km.trim()){ toast('Falta el kilometraje.'); return; }
  markSaving();
  await withBusyButton(btn, 'Guardando…', async () => {
    try{
      let clienteId = d.clienteId;
      if(!clienteId){
        clienteId = await collectionRef('clientes').add({nombre:d.nombre.trim(), telefono:d.telefono.trim(), direccion:'', createdAt:Date.now()});
      }
      let vehiculoId = d.vehiculoId;
      if(!vehiculoId){
        vehiculoId = await collectionRef('vehiculos').add({clienteId, patente:d.patente.trim().toUpperCase(), marca:marcaIngreso(d), modelo:modeloIngreso(d), anio:d.anio||'', createdAt:Date.now()});
      }
      const numero = siguienteNumeroIngreso();
      const id = await collectionRef('ingresos').add({
        numero, clienteId, vehiculoId, estado:'en_taller',
        km:d.km.trim(), combustible:d.combustible, danios:d.danios, danioFotos:d.danioFotos||{}, fotos:d.fotos, extras:d.extras,
        elementos:d.elementos, llaves:d.llaves, testigos:d.testigos, motivo:d.motivo.trim(), observaciones:d.observaciones.trim(),
        firma:d.firma, aclaracion:(d.aclaracion||d.nombre||'').trim(), createdAt:Date.now()
      });
      await collectionRef('ordenes').add({clienteId, vehiculoId, ingresoId:id, estado:'recibido', fechaIngreso:todayISO(), nota:d.motivo.trim(), createdAt:Date.now()});
      doneSaving();
      state._ingreso = blankIngreso();
      try{ localStorage.removeItem(lsKey('ingreso_borrador')); }catch(e){}
      state._ingresoForm = false;
      state.filtroIngresos = 'en_taller';
      render();
      setTimeout(() => abrirActa(id), 80);
      toast('Ingreso guardado. Mandale el acta al cliente.');
    }catch(e){
      saveError(e);
      if(String(e && e.name).includes('Quota')) toast('El navegador se quedó sin espacio para fotos (solo pasa en la demo).');
    }
  });
}

/* ===================== ACTA DE INGRESO (documento) ===================== */
function actaHtml(i){
  const c = state.clientes.find(x=>x.id===i.clienteId) || {};
  const v = state.vehiculos.find(x=>x.id===i.vehiculoId) || {};
  const danios = i.danios || {};
  const dIds = Object.keys(danios);
  const fotoBox = (lado) => {
    const src = i.fotos && i.fotos[lado.id];
    return `<div class="a-foto">${src ? `<div class="ph" style="position:absolute; inset:0; background:url('${src}') center/cover no-repeat;"></div>` : `<img class="guide" src="${guiaSrc(lado.id)}" alt="">`}<span class="tag">${esc(lado.label)}${src?'':(i.demo?' · ejemplo':' · sin foto')}</span></div>`;
  };
  const extras = i.extras || [];
  return `
  <div id="acta">
    <div class="a-head">
      <img src="./logo-tutaller.png" alt="${esc(state.negocio.nombre||'Tu Taller')}">
      <div class="meta">
        <div class="eb">${esc((state.negocio.nombre||'').toUpperCase())}</div>
        <div class="tt">ACTA DE INGRESO</div>
        <span class="nro">${ingresoNumero(i)}</span>
        <div class="fh">${fmtFechaHora(i.createdAt)}</div>
      </div>
    </div>

    <div class="a-sec">
      <div class="a-grid3">
        <div class="a-box"><div class="k">Cliente</div><div class="v">${esc(c.nombre||'—')}</div><div class="s">${esc(c.telefono||'')}</div></div>
        <div class="a-box"><div class="k">Vehículo</div><div class="v">${esc(`${v.marca||''} ${v.modelo||''}`.trim()||'—')}</div><div class="s">Patente ${esc((v.patente||'—').toUpperCase())}${v.anio?' · '+esc(v.anio):''}</div></div>
        <div class="a-box"><div class="k">Kilometraje · Combustible</div><div class="v">${fmtKm(i.km)}</div>
          <div class="a-fuel">${COMBUSTIBLE.map((x,k)=>`<span class="${i.combustible!=null && k<=i.combustible?'f':''}"></span>`).join('')}</div>
          <div class="s">${i.combustible!=null ? COMBUSTIBLE[i.combustible] : 'Sin dato'}</div></div>
      </div>
    </div>
    ${i.motivo ? `<div class="a-sec"><div class="a-h">Motivo de ingreso</div><div class="a-text">${esc(i.motivo)}</div></div>` : ''}

    <div class="a-sec">
      <div class="a-h"><span>Estado exterior</span><span style="letter-spacing:.06em; font-weight:600; color:#666;">R rayón · A abolladura · X roto/falta</span></div>
      <div class="a-danios">
        ${danioSvg(danios, {prefix:'acta', width:200})}
        <div>
          ${dIds.length ? `<ul class="a-list">${dIds.map(id=>`<li><span>${esc(zonaLabel(id))}${(i.danioFotos||{})[id]?' · 📷 ver foto':''}</span><b>${esc(tipoDanio(danios[id]).label)}</b></li>`).join('')}</ul>`
            : `<div class="a-text">Sin daños visibles al momento del ingreso.</div>`}
          <div class="a-h" style="margin-top:18px;">Fotos al ingreso</div>
          <div class="a-fotos">${FOTO_LADOS.map(fotoBox).join('')}</div>
        </div>
      </div>
      ${Object.keys(i.danioFotos||{}).filter(z=>danios[z]).length ? `<div class="a-h" style="margin-top:16px;">Fotos de los daños</div>
        <div class="a-fotos" style="grid-template-columns:repeat(3,1fr);">${Object.keys(i.danioFotos).filter(z=>danios[z]).map(z=>`<div class="a-foto"><div class="ph" style="position:absolute; inset:0; background:url('${i.danioFotos[z]}') center/cover no-repeat;"></div><span class="tag">${esc(zonaLabel(z))} · ${esc(tipoDanio(danios[z]).label)}</span></div>`).join('')}</div>` : ''}
      ${extras.length ? `<div class="a-fotos" style="grid-template-columns:repeat(4,1fr); margin-top:10px;">${extras.map((src,k)=>`<div class="a-foto"><div class="ph" style="position:absolute; inset:0; background:url('${src}') center/cover no-repeat;"></div><span class="tag">Foto ${k+1}</span></div>`).join('')}</div>` : ''}
    </div>

    <div class="a-sec">
      <div class="a-grid2">
        <div>
          <div class="a-h">Queda en el vehículo</div>
          <div class="a-checks">${ELEMENTOS.map(it=>`<div><span class="b ${i.elementos&&i.elementos[it.id]?'on':''}">${i.elementos&&i.elementos[it.id]?'✓':''}</span>${esc(it.label)}</div>`).join('')}
            <div><span class="b on">${esc(i.llaves||'1')}</span>Juego${(i.llaves||'1')==='1'?'':'s'} de llaves</div></div>
        </div>
        <div>
          <div class="a-h">Testigos en el tablero</div>
          ${Object.keys(i.testigos||{}).filter(k=>i.testigos[k]).length
            ? `<div class="a-checks">${TESTIGOS.filter(t=>i.testigos[t.id]).map(t=>`<div><span class="b on">!</span>${esc(t.label)}</div>`).join('')}</div>`
            : `<div class="a-text">Ningún testigo encendido.</div>`}
          ${i.observaciones ? `<div class="a-h" style="margin-top:14px;">Observaciones</div><div class="a-text">${esc(i.observaciones)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="a-sec">
      <div class="a-firma">
        <div class="legal">El cliente declara que el vehículo descripto ingresa al taller en el estado que muestran este acta y sus fotos, con el kilometraje y el nivel de combustible indicados. Cualquier daño no registrado acá se considera posterior al ingreso.</div>
        <div class="sig">${i.firma ? `<img src="${i.firma}" alt="Firma">` : '<div style="height:80px;"></div>'}<div class="line">${esc(i.aclaracion || c.nombre || 'Firma del cliente')}</div></div>
      </div>
    </div>

    <div class="a-foot">
      <b>${esc((state.negocio.nombre||'').toUpperCase())}</b>
      <span>${esc(state.negocio.direccion||'')}${state.negocio.telefono?' · '+esc(state.negocio.telefono):''}</span>
      <span class="made-by">by <img src="./appsart-brand.png" alt="AppsArt"></span>
    </div>
  </div>`;
}

function abrirActa(id){
  const i = state.ingresos.find(x=>x.id===id);
  if(!i) return;
  const c = state.clientes.find(x=>x.id===i.clienteId);
  openModal(`
    <div class="modal-head"><h2>Acta de ingreso · ${ingresoNumero(i)}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="acta-wrap" id="actaWrap">${actaHtml(i)}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="actaPdfBtn" data-action="actaPdf" data-id="${i.id}">⬇ Descargar PDF</button>
      <button class="btn btn-share" id="actaShareBtn" data-action="actaCompartir" data-id="${i.id}">📤 Compartir PDF</button>
      ${c && c.telefono ? `<a class="btn btn-wa" href="${waLink(c.telefono, mensajeIngreso(i))}" target="_blank" rel="noopener" data-action="avisoIngresoEnviado" data-id="${i.id}">💬 Avisar por WhatsApp</a>` : ''}
    </div>
    <p class="small muted" style="text-align:right; margin:8px 0 0;">Desde el celular, "Compartir PDF" abre WhatsApp con el acta adjunta.</p>`, {wide:true});
  requestAnimationFrame(scaleActa);
}
function scaleActa(){
  const acta = document.getElementById('acta'), wrap = document.getElementById('actaWrap');
  if(!acta || !wrap) return;
  const scale = Math.min(1, (wrap.clientWidth - 36) / 820);
  acta.style.transform = `scale(${scale})`;
  wrap.style.height = (acta.scrollHeight * scale + 36) + 'px';
}
window.addEventListener('resize', scaleActa);

async function buildActaPdfBlob(){
  const acta = document.getElementById('acta');
  await waitImagesReady(acta);
  const prev = acta.style.transform;
  acta.style.transform = 'none'; acta.style.boxShadow = 'none';
  void acta.offsetHeight;
  const h = acta.scrollHeight;
  let canvas;
  try{ canvas = await html2canvas(acta, {scale:2, backgroundColor:'#ffffff', width:820, height:h, windowWidth:820, useCORS:true}); }
  finally{ acta.style.transform = prev; acta.style.boxShadow = ''; }
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({unit:'px', format:[820, h], hotfixes:['px_scaling']});
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 820, h);
  return pdf.output('blob');
}
function actaFileName(i){
  const v = state.vehiculos.find(x=>x.id===i.vehiculoId);
  return 'acta-ingreso-' + String(i.numero||0).padStart(4,'0') + '-' + ((v && (v.patente||v.modelo)) || 'vehiculo').toLowerCase().replace(/[^a-z0-9]+/g,'-') + '.pdf';
}

/* ===================== ACCIONES ===================== */
Object.assign(actions, {
  nuevoIngreso(){ state._ingresoForm = true; renderIngreso(); window.scrollTo(0,0); },
  cancelarIngreso(){ state._ingresoForm = false; renderIngreso(); window.scrollTo(0,0); },
  ingresosTab(el){ state.filtroIngresos = el.dataset.tab; renderIngreso(); },
  buscarClienteIngreso(){ state._buscadorClienteQuery=''; state._buscadorClienteTarget='elegirClienteIngreso'; openModal(buscadorClienteHtml()); },
  elegirClienteIngreso(el){
    const c = state.clientes.find(x=>x.id===el.dataset.id);
    if(!c) return;
    const vs = vehiculosDeCliente(c.id);
    Object.assign(state._ingreso, {clienteId:c.id, nombre:c.nombre||'', telefono:c.telefono||'', aclaracion:c.nombre||'', vehiculoId: vs.length===1 ? vs[0].id : null});
    saveIngresoDraft(); closeModal(); renderIngresoForm();
  },
  quitarClienteIngreso(){ Object.assign(state._ingreso, {clienteId:null, vehiculoId:null, nombre:'', telefono:''}); saveIngresoDraft(); renderIngresoForm(); },
  setCombustible(el){
    const k = +el.dataset.k;
    state._ingreso.combustible = k;
    document.querySelectorAll('#fuelSel button').forEach((b,j) => b.classList.toggle('fill', j<=k));
    saveIngresoDraft();
  },
  tomarFoto(el){ _fotoLado = el.dataset.lado; document.getElementById('fotoInput').click(); },
  quitarExtra(el, e){ e.stopPropagation(); state._ingreso.extras.splice(+el.dataset.k, 1); document.getElementById('extrasGrid').innerHTML = extrasHtml(); saveIngresoDraft(); },
  setDanioTool(el){
    state._ingresoTool = el.dataset.tool;
    document.querySelectorAll('#danioTools .danio-tool').forEach(b => b.classList.toggle('on', b.dataset.tool===state._ingresoTool));
  },
  marcarZona(el){
    const z = el.dataset.zona, d = state._ingreso.danios, tool = state._ingresoTool;
    if(tool === 'borrar' || d[z] === tool){ delete d[z]; if(state._ingreso.danioFotos) delete state._ingreso.danioFotos[z]; } else d[z] = tool;
    document.getElementById('danioPlano').innerHTML = danioSvg(d, {interactive:true, prefix:'form'});
    document.getElementById('danioList').innerHTML = daniosListHtml();
    saveIngresoDraft();
  },
  toggleChk(el){
    const g = state._ingreso[el.dataset.grupo];
    g[el.dataset.id] = !g[el.dataset.id];
    el.classList.toggle('on', g[el.dataset.id]);
    el.setAttribute('aria-checked', g[el.dataset.id]);
    el.querySelector('.box').textContent = g[el.dataset.id] ? '✓' : '';
    saveIngresoDraft();
  },
  borrarFirma(){ state._ingreso.firma = null; saveIngresoDraft(); renderIngresoForm(); },
  guardarIngreso(el){ guardarIngreso(el); },
  verActa(el){ abrirActa(el.dataset.id); },
  actaPdf(el){
    const i = state.ingresos.find(x=>x.id===el.dataset.id);
    withBusyButton(el, 'Generando…', async () => {
      try{ downloadBlob(await buildActaPdfBlob(), actaFileName(i)); }
      catch(e){ console.error(e); alert('No se pudo generar el PDF. Probá de nuevo.'); }
    });
  },
  actaCompartir(el){
    const i = state.ingresos.find(x=>x.id===el.dataset.id);
    withBusyButton(el, 'Generando…', async () => {
      try{
        const blob = await buildActaPdfBlob();
        const file = new File([blob], actaFileName(i), {type:'application/pdf'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title:'Acta de ingreso', text: mensajeIngreso(i)});
          collectionRef('contactos').add({clienteId:i.clienteId, vehiculoId:i.vehiculoId, ingresoId:i.id, tipo:'ingreso', fecha:todayISO(), createdAt:Date.now()});
        } else {
          downloadBlob(blob, actaFileName(i));
          toast('En la compu se descarga. Desde el celu se abre WhatsApp directo.');
        }
      }catch(e){ if(e && e.name==='AbortError') return; alert('No se pudo compartir el PDF. Probá con "Descargar PDF".'); }
    });
  },
  avisoIngresoEnviado(el){
    const i = state.ingresos.find(x=>x.id===el.dataset.id);
    if(!i) return;
    collectionRef('contactos').add({clienteId:i.clienteId, vehiculoId:i.vehiculoId, ingresoId:i.id, tipo:'ingreso', fecha:todayISO(), createdAt:Date.now()});
  },
  terminarIngreso(el){
    if(!cargarIngresoEnInforme(el.dataset.id)) return;
    goSection('informe');
    toast('Informe vinculado al acta: ya tiene cliente, vehículo, km y foto. Completá lo que se hizo.');
  },
  eliminarIngreso(el){
    confirmDialog('¿Eliminar este ingreso y su acta? No se puede deshacer.', () => {
      markSaving();
      collectionRef('ingresos').remove(el.dataset.id).then(()=>{ doneSaving(); toast('Ingreso eliminado.'); }).catch(saveError);
    });
  }
});

inputActions.ingreso_marca = (el) => { state._ingreso.marca = el.value; state._ingreso.modelo = ''; saveIngresoDraft(); renderIngresoForm(); };
inputActions.ingreso_modelo = (el) => { state._ingreso.modelo = el.value; saveIngresoDraft(); renderIngresoForm(); };
inputActions.ingreso_anio = (el) => { state._ingreso.anio = el.value; saveIngresoDraft(); };
inputActions.ingreso_vehiculo_select = (el) => { state._ingreso.vehiculoId = el.value || null; saveIngresoDraft(); renderIngresoForm(); };
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-ing]');
  if(!el) return;
  state._ingreso[el.dataset.ing] = el.value;
  saveIngresoDraft();
});

/* ---------- vínculo ingreso → informe: el informe arranca con todo lo que ya se cargó al entrar ---------- */
function cargarIngresoEnInforme(id){
  const i = state.ingresos.find(x=>x.id===id);
  if(!i) return false;
  cargarClienteVehiculoComoInforme(i.clienteId, i.vehiculoId);
  state.informe.ingresoId = i.id;
  state.informe.fields.km = fmtKm(i.km);
  state.informe.photo = (i.fotos && (i.fotos.frente || i.fotos.izq || i.fotos.der || i.fotos.trasera)) || null;
  const obs = [];
  if(i.motivo) obs.push('Motivo de ingreso: ' + i.motivo);
  const testigos = TESTIGOS.filter(t => i.testigos && i.testigos[t.id]).map(t => t.label);
  if(testigos.length) obs.push('Ingresó con testigos encendidos: ' + testigos.join(', '));
  state.informe.obs = obs.length ? obs : [''];
  return true;
}
