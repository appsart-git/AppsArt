'use strict';
/* ===================== STICKERS QR: ficha del auto en el parabrisas ===================== */
// Flujo de stickers preimpresos (el mismo que se le ofreció a Birolo):
// 1. La app genera una tanda de códigos al azar, imposibles de adivinar, y el PDF para la gráfica.
//    Cada sticker lleva el QR, el logo del taller y un número corto visible (T-0147). Se imprimen en
//    vinilo para pegar del lado de adentro del parabrisas, así el taller los tiene en stock.
// 2. Cuando entra un auto, se escanea un sticker (o se escribe su número) y queda asignado.
// 3. El cliente lo escanea con la cámara y ve la ficha de su auto (ficha.html), con un botón de turno.
// 4. Si el sticker se rompe o el auto cambia de dueño, se da de baja y se asigna otro: el historial
//    vive en el auto, no en el sticker.
// Un sticker sin asignar muestra solo el taller y el botón para pedir turno.

const STICKER_ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
function codigoSticker(){
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => STICKER_ALFABETO[b % STICKER_ALFABETO.length]).join('');
}
function prefijoSticker(){ return (state.negocio.prefijoSticker || 'T').toUpperCase(); }
function numeroSticker(n){ return prefijoSticker() + '-' + String(n).padStart(4,'0'); }
function stickerDeVehiculo(vehiculoId){ return state.stickers.find(s => s.vehiculoId === vehiculoId && s.estado === 'asignado'); }
function stickersOrdenados(estado){
  return state.stickers.filter(s => s.estado === estado).sort((a,b) => (a.orden||0) - (b.orden||0));
}
/* "147", "t147", "T-0147" o el link completo del QR: todos encuentran el mismo sticker. */
function buscarSticker(texto){
  const t = String(texto || '').trim();
  if(!t) return null;
  try{
    const c = new URL(t).searchParams.get('c');
    if(c) return state.stickers.find(s => s.codigo === c) || null;
  }catch(e){ /* no era un link */ }
  const porCodigo = state.stickers.find(s => s.codigo === t.toLowerCase());
  if(porCodigo) return porCodigo;
  const num = parseInt(t.replace(/\D/g,''), 10);
  return isNaN(num) ? null : (state.stickers.find(s => s.orden === num) || null);
}

/* ---------- links y QR ---------- */
function fichaBaseUrl(){ return new URL('ficha.html', location.href).href; }
function stickerUrl(s){ return fichaBaseUrl() + '?c=' + s.codigo; }
function fichaDeVehiculo(vehiculoId){
  const s = stickerDeVehiculo(vehiculoId);
  return construirFicha({vehiculos: state.vehiculos, trabajos: state.trabajos, ingresos: state.ingresos, negocio: state.negocio}, vehiculoId, s ? s.numero : '');
}
/* QR de pantalla de la demo: además del código lleva la ficha adentro (ver ficha-datos.js). */
function stickerUrlDemo(s){
  const f = fichaDeVehiculo(s.vehiculoId);
  return stickerUrl(s) + (f ? '#d=' + fichaCodificar(f) : '');
}
function qrDataUrl(texto, nivel){
  const q = qrcode(0, nivel || 'M');
  q.addData(texto);
  q.make();
  return q.createDataURL(8, 0);
}

/* ---------- sección ---------- */
function renderQR(){
  const tab = state.filtroStickers || 'asignado';
  const asignados = stickersOrdenados('asignado'), libres = stickersOrdenados('libre'), baja = stickersOrdenados('baja');
  const list = tab === 'libre' ? libres : tab === 'baja' ? baja : asignados;
  const rango = state.stickers.length ? `${numeroSticker(Math.min(...state.stickers.map(s=>s.orden)))} a ${numeroSticker(Math.max(...state.stickers.map(s=>s.orden)))}` : '';
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Stickers QR</h1></div>
    <div class="ingreso-hero">
      <p>Cada auto sale con un sticker en el parabrisas. El cliente lo escanea con la cámara y ve la ficha de su auto: trabajos, kilómetros y cuándo le toca volver, con un botón para pedir turno.</p>
      <button class="btn btn-primary btn-lg" data-action="asignarSticker">🔳 Asignar sticker</button>
    </div>
    <div class="kpi-grid-3">
      <div class="kpi-card"><div class="lbl">Autos con sticker</div><div class="val">${asignados.length}</div><div class="sub">con su ficha al día</div></div>
      <div class="kpi-card"><div class="lbl">Stickers libres</div><div class="val">${libres.length}</div><div class="sub">listos para asignar</div></div>
      <div class="kpi-card"><div class="lbl">Dados de baja</div><div class="val">${baja.length}</div><div class="sub">rotos o reemplazados</div></div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <h2>Tanda para la gráfica</h2>
      <p class="small muted" style="margin-top:-6px;">${rango ? `Stickers ${rango}. ` : ''}Se imprimen en vinilo para pegar del lado de adentro del parabrisas (impresión espejada), así no los arruinan la lluvia, el sol ni el lavadero.</p>
      <div class="btn-row" style="flex-wrap:wrap;">
        <button class="btn btn-ghost" data-action="generarTandaStickers">＋ Generar 30 stickers más</button>
        <button class="btn btn-share" id="stickersPdfBtn" data-action="stickersPdf" ${libres.length ? '' : 'disabled'}>⬇ PDF de los libres para la gráfica</button>
      </div>
    </div>
    <div class="segmented" style="margin-bottom:14px;">
      <button class="${tab==='asignado'?'on':''}" data-action="stickersTab" data-tab="asignado">Asignados (${asignados.length})</button>
      <button class="${tab==='libre'?'on':''}" data-action="stickersTab" data-tab="libre">Libres (${libres.length})</button>
      <button class="${tab==='baja'?'on':''}" data-action="stickersTab" data-tab="baja">De baja (${baja.length})</button>
    </div>
    <div class="card-list">${list.length ? list.map(stickerRowHtml).join('') : `<p class="empty">${tab==='asignado' ? 'Todavía no hay autos con sticker.' : tab==='libre' ? 'No quedan stickers libres: generá una tanda nueva.' : 'Ningún sticker dado de baja.'}</p>`}</div>`;
}

function stickerRowHtml(s){
  const v = s.vehiculoId && state.vehiculos.find(x => x.id === s.vehiculoId);
  const c = v && state.clientes.find(x => x.id === v.clienteId);
  const acciones = s.estado === 'asignado'
    ? `<button class="btn btn-sm btn-primary" data-action="fichaQrVehiculo" data-id="${s.vehiculoId}">Ver ficha</button>`
    : s.estado === 'libre'
      ? `<button class="btn btn-sm btn-ghost" data-action="asignarSticker" data-numero="${esc(s.numero)}">Asignar</button>`
      : '';
  return `
    <div class="recontacto-row">
      <div class="info">
        <b><span class="sticker-num">${esc(s.numero)}</span>${v ? esc(vehiculoLabel(v)) : s.estado === 'libre' ? 'Libre' : 'Dado de baja'}</b>
        <span>${c ? esc(c.nombre) + ' · ' : ''}${s.estado === 'asignado' && s.asignadoAt ? 'Asignado el ' + fmtDate(s.asignadoAt) : s.estado === 'baja' && s.bajaAt ? 'Baja el ' + fmtDate(s.bajaAt) + (s.motivoBaja ? ' · ' + esc(s.motivoBaja) : '') : 'Listo para pegar'}</span>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">${acciones}</div>
    </div>`;
}

/* ---------- ficha QR de un vehículo ---------- */
function fichaQrModalHtml(vehiculoId){
  const v = state.vehiculos.find(x => x.id === vehiculoId);
  if(!v) return '';
  const s = stickerDeVehiculo(vehiculoId);
  const head = `<div class="modal-head"><h2>Ficha QR · ${esc((v.patente || v.modelo || 'Vehículo').toUpperCase())}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>`;
  if(!s){
    return head + `
      <div class="qr-vacio">
        <div class="sticker-mock vacio"><img src="./logo-tutaller.png" alt=""><div class="qr-box"><span>sin sticker</span></div></div>
        <div>
          <p style="margin-top:0;"><b>${esc(vehiculoLabel(v))}</b> todavía no tiene sticker.</p>
          <p class="small muted">Agarrá uno de la tanda, escanealo con el celular o escribí su número, y pegalo del lado de adentro del parabrisas.</p>
          <button class="btn btn-primary" data-action="asignarSticker" data-vehiculo="${v.id}">🔳 Asignar sticker</button>
        </div>
      </div>`;
  }
  const f = fichaDeVehiculo(vehiculoId);
  const url = stickerUrlDemo(s);
  return head + `
    <div class="qr-ficha-grid">
      <div class="sticker-mock">
        <img src="./logo-tutaller.png" alt="${esc(state.negocio.nombre||'')}">
        <div class="qr-box"><img src="${qrDataUrl(url, 'L')}" alt="Código QR de la ficha"></div>
        <div class="cta">Escaneá y mirá la ficha de tu auto</div>
        <div class="nx">N° ${esc(s.numero)}</div>
      </div>
      <div style="min-width:0;">
        <p class="small muted" style="margin-top:0;">Así lo ve el cliente. Probalo: escaneá el QR con tu celular.</p>
        <div class="ficha-mini">
          <div><span>Último service</span><b>${fichaFecha(f.us)}</b></div>
          <div><span>Kilómetros</span><b>${fichaKm(f.km)}</b></div>
          <div><span>Próximo service</span><b>${fichaMesAnio(f.ps)}</b></div>
          <div><span>Correa</span><b>${f.co ? fichaMesAnio(f.co) : '—'}</b></div>
        </div>
        <p class="small muted">${f.h.length} trabajo${f.h.length===1?'':'s'} en el historial. No se ven precios, ni el nombre ni el teléfono del cliente.</p>
        <div class="btn-row" style="flex-wrap:wrap;">
          <a class="btn btn-share" href="${esc(url)}" target="_blank" rel="noopener">👁️ Abrir la ficha</a>
          <button class="btn btn-ghost" data-action="cambiarSticker" data-id="${s.id}">Cambiar sticker</button>
        </div>
        <button class="btn-danger" style="margin-top:10px;" data-action="bajaSticker" data-id="${s.id}">Dar de baja el sticker</button>
      </div>
    </div>
    <p class="small muted" style="margin:14px 0 0;">En la demo, este QR de pantalla lleva la ficha adentro para que lo pruebes con cualquier celular. En la instalación real el sticker solo tiene su código y la ficha se lee de la base del taller, siempre al día.</p>`;
}

/* ---------- asignar ---------- */
function asignarStickerHtml(){
  const a = state._qrAsignar;
  const libre = stickersOrdenados('libre')[0];
  const v = a.vehiculoId && state.vehiculos.find(x => x.id === a.vehiculoId);
  const vehiculos = state.vehiculos.slice().sort((x,y) => (x.patente||'').localeCompare(y.patente||''));
  return `
    <div class="modal-head"><h2>Asignar sticker</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    ${v ? `<p style="margin-top:0;">Vehículo: <b>${esc(vehiculoLabel(v))}</b></p>`
      : `<div class="field"><label>Vehículo</label><select data-change="qr_vehiculo"><option value="">Elegir por patente…</option>${vehiculos.map(x => {
          const c = state.clientes.find(y => y.id === x.clienteId);
          const tiene = stickerDeVehiculo(x.id);
          return `<option value="${x.id}">${esc(vehiculoLabel(x))}${c ? ' · ' + esc(c.nombre) : ''}${tiene ? ' (ya tiene ' + esc(tiene.numero) + ')' : ''}</option>`;
        }).join('')}</select></div>`}
    <div class="field"><label>Número del sticker</label>
      <div style="display:flex; gap:8px;">
        <input id="qr_numero" data-input="qr_numero" value="${esc(a.numero||'')}" placeholder="Ej: ${libre ? esc(libre.numero) : prefijoSticker()+'-0147'}" style="flex:1;">
        <button class="btn btn-share" data-action="escanearSticker">📷 Escanear</button>
      </div>
    </div>
    ${libre && !a.numero ? `<button class="btn btn-sm btn-ghost" style="margin-bottom:12px;" data-action="usarProximoLibre" data-numero="${esc(libre.numero)}">Usar el próximo libre: ${esc(libre.numero)}</button>` : ''}
    <div class="modal-actions"><button class="btn btn-primary btn-block" data-action="confirmarAsignacion">Asignar sticker</button></div>`;
}
function abrirAsignar(){ openModal(asignarStickerHtml()); }

async function confirmarAsignacion(){
  const a = state._qrAsignar;
  if(!a.vehiculoId){ toast('Elegí el vehículo.'); return; }
  const s = buscarSticker(a.numero);
  if(!s){ toast('No encontré ese sticker. Revisá el número.'); return; }
  if(s.estado === 'baja'){ toast(`El ${s.numero} está dado de baja. Usá otro.`); return; }
  if(s.estado === 'asignado' && s.vehiculoId !== a.vehiculoId){
    const otro = state.vehiculos.find(x => x.id === s.vehiculoId);
    toast(`El ${s.numero} ya está en ${otro ? vehiculoLabel(otro) : 'otro auto'}.`); return;
  }
  if(s.estado === 'asignado'){ toast('Ese sticker ya es de este auto.'); return; }
  markSaving();
  try{
    const anterior = stickerDeVehiculo(a.vehiculoId);
    if(anterior) await collectionRef('stickers').update(anterior.id, {estado:'baja', bajaAt:Date.now(), motivoBaja:'Reemplazado por ' + s.numero});
    await collectionRef('stickers').update(s.id, {estado:'asignado', vehiculoId:a.vehiculoId, asignadoAt:Date.now()});
    doneSaving();
    const vehiculoId = a.vehiculoId;
    state._qrAsignar = {};
    toast(`Sticker ${s.numero} asignado. Pegalo del lado de adentro del parabrisas.`);
    setTimeout(() => { openModal(fichaQrModalHtml(vehiculoId), {wide:true}); if(state.section === 'qr') renderQR(); }, 150);
  }catch(e){ saveError(e); }
}

/* ---------- escanear con la cámara ---------- */
// BarcodeDetector (Chrome/Android) lee el QR directo; en iPhone se usa jsQR, que se carga solo si hace falta.
let _scanStream = null;
function cargarJsQR(){
  if(window.jsQR) return Promise.resolve();
  return new Promise((ok, mal) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    sc.onload = ok; sc.onerror = mal;
    document.head.appendChild(sc);
  });
}
function cortarCamara(){ if(_scanStream){ _scanStream.getTracks().forEach(t => t.stop()); _scanStream = null; } }
async function abrirEscaner(){
  openModal(`
    <div class="modal-head"><h2>Escanear sticker</h2><button class="modal-close" data-action="volverAsignar">&times;</button></div>
    <div class="scan-box"><video id="scanVideo" playsinline muted></video><div class="scan-mira"></div></div>
    <p class="small muted" style="text-align:center;">Apuntá la cámara al QR del sticker.</p>
    <button class="btn btn-ghost btn-block" data-action="volverAsignar">Escribir el número a mano</button>`, {closeOnBackdrop:false});
  try{
    _scanStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
  }catch(e){
    toast('No se pudo abrir la cámara. Escribí el número del sticker.');
    abrirAsignar(); return;
  }
  const video = document.getElementById('scanVideo');
  if(!video){ cortarCamara(); return; }
  video.srcObject = _scanStream;
  await video.play().catch(() => {});
  let detector = null;
  if('BarcodeDetector' in window){ try{ detector = new BarcodeDetector({formats:['qr_code']}); }catch(e){ detector = null; } }
  if(!detector){ try{ await cargarJsQR(); }catch(e){ toast('No se pudo cargar el lector. Escribí el número.'); cortarCamara(); abrirAsignar(); return; } }
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', {willReadFrequently:true});
  const leer = async () => {
    const vid = document.getElementById('scanVideo');
    if(!vid || !_scanStream){ cortarCamara(); return; }
    let texto = null;
    if(vid.readyState >= 2){
      if(detector){
        const r = await detector.detect(vid).catch(() => []);
        if(r.length) texto = r[0].rawValue;
      } else {
        canvas.width = vid.videoWidth; canvas.height = vid.videoHeight;
        ctx.drawImage(vid, 0, 0);
        const r = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if(r) texto = r.data;
      }
    }
    if(texto){
      const s = buscarSticker(texto);
      if(s){
        cortarCamara();
        state._qrAsignar.numero = s.numero;
        abrirAsignar();
        toast(`Leído: ${s.numero}`);
        return;
      }
    }
    requestAnimationFrame(leer);
  };
  requestAnimationFrame(leer);
}

/* ---------- PDF para la gráfica ---------- */
// Hoja A4 con 9 stickers (3 x 3), cada uno con el logo, el QR (solo el código, sin datos) y su número.
function hojaStickersHtml(lista, desde, hasta){
  return `<div class="hoja-stickers">
    <div class="hoja-head">${esc(state.negocio.nombre || 'Tu Taller')} · Stickers QR ${esc(desde)} a ${esc(hasta)} · Vinilo para pegar del lado de adentro del parabrisas (impresión espejada)</div>
    <div class="hoja-grid">${lista.map(s => `
      <div class="sticker-mock print">
        <img src="./logo-tutaller.png" alt="">
        <div class="qr-box"><img src="${qrDataUrl(stickerUrl(s), 'M')}" alt=""></div>
        <div class="cta">Escaneá y mirá la ficha de tu auto</div>
        <div class="nx">N° ${esc(s.numero)}</div>
      </div>`).join('')}</div>
  </div>`;
}
async function buildStickersPdf(){
  const libres = stickersOrdenados('libre');
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed; left:-10000px; top:0; width:794px;';
  document.body.appendChild(host);
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({unit:'mm', format:'a4'});
  try{
    for(let i = 0; i < libres.length; i += 9){
      const pagina = libres.slice(i, i + 9);
      host.innerHTML = hojaStickersHtml(pagina, pagina[0].numero, pagina[pagina.length-1].numero);
      const hoja = host.firstElementChild;
      await waitImagesReady(hoja);
      const canvas = await html2canvas(hoja, {scale:2, backgroundColor:'#ffffff', width:794, height:1123, windowWidth:794});
      if(i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    }
  }finally{ host.remove(); }
  return pdf.output('blob');
}

/* ---------- acciones ---------- */
Object.assign(actions, {
  stickersTab(el){ state.filtroStickers = el.dataset.tab; renderQR(); },
  fichaQrVehiculo(el){ openModal(fichaQrModalHtml(el.dataset.id), {wide:true}); },
  asignarSticker(el){
    state._qrAsignar = {vehiculoId: el.dataset.vehiculo || null, numero: el.dataset.numero || ''};
    abrirAsignar();
  },
  usarProximoLibre(el){ state._qrAsignar.numero = el.dataset.numero; abrirAsignar(); },
  escanearSticker(){ abrirEscaner(); },
  volverAsignar(){ cortarCamara(); abrirAsignar(); },
  confirmarAsignacion(){ confirmarAsignacion(); },
  cambiarSticker(el){
    const s = state.stickers.find(x => x.id === el.dataset.id);
    if(!s) return;
    state._qrAsignar = {vehiculoId: s.vehiculoId, numero: ''};
    abrirAsignar();
    toast(`Al asignar el nuevo, el ${s.numero} queda dado de baja.`);
  },
  bajaSticker(el){
    const s = state.stickers.find(x => x.id === el.dataset.id);
    if(!s) return;
    confirmDialog(`¿Dar de baja el sticker ${s.numero}? El historial del auto no se pierde: le podés asignar otro cuando quieras.`, () => {
      markSaving();
      collectionRef('stickers').update(s.id, {estado:'baja', bajaAt:Date.now(), motivoBaja:'Roto o cambio de dueño'})
        .then(() => { doneSaving(); closeModal(); toast(`${s.numero} dado de baja.`); if(state.section === 'qr') renderQR(); })
        .catch(saveError);
    });
  },
  generarTandaStickers(){
    const desde = state.stickers.reduce((m,s) => Math.max(m, s.orden || 0), 100) + 1;
    markSaving();
    Promise.all(Array.from({length:30}, (_, k) => collectionRef('stickers').add({
      orden: desde + k, numero: numeroSticker(desde + k), codigo: codigoSticker(), estado:'libre', vehiculoId:null, createdAt:Date.now()
    }))).then(() => { doneSaving(); toast(`Listos: ${numeroSticker(desde)} a ${numeroSticker(desde + 29)}.`); state.filtroStickers = 'libre'; renderQR(); })
      .catch(saveError);
  },
  stickersPdf(el){
    withBusyButton(el, 'Generando…', async () => {
      try{ downloadBlob(await buildStickersPdf(), 'stickers-qr-' + todayISO() + '.pdf'); }
      catch(e){ console.error(e); alert('No se pudo generar el PDF. Probá de nuevo.'); }
    });
  }
});
inputActions.qr_vehiculo = (el) => { state._qrAsignar.vehiculoId = el.value || null; };
inputActions.qr_numero = (el) => { state._qrAsignar.numero = el.value; };

/* ---------- datos de ejemplo ---------- */
// Marca de sembrado propia: así los stickers también aparecen en un navegador que ya tenía la demo.
// De paso completa los km de los trabajos de ejemplo (antes no se guardaban), para que la ficha los muestre.
function seedStickersIfEmpty(){
  if(localStorage.getItem(lsKey('seeded_qr'))) return;
  const vehiculos = lsReadAll('vehiculos');
  const trabajos = lsReadAll('trabajos');
  const hoy = new Date();
  trabajos.forEach(t => {
    if(t.km) return;
    const v = vehiculos.find(x => x.id === t.vehiculoId);
    const anio = parseInt(v && v.anio, 10) || 2018;
    const f = new Date((t.fecha || hoy.toISOString().slice(0,10)) + 'T00:00:00');
    const anios = Math.max(0.4, f.getFullYear() + f.getMonth()/12 - anio);
    const ajuste = ((v && v.patente || 'x').charCodeAt(2) % 7) * 900;
    t.km = String(Math.round((anios * 13500 + ajuste) / 10) * 10);
  });
  lsWriteAll('trabajos', trabajos);

  const stickers = [];
  for(let n = 101; n <= 160; n++){
    stickers.push({id: genLocalId(), orden: n, numero: 'T-' + String(n).padStart(4,'0'), codigo: codigoSticker(), estado:'libre', vehiculoId:null, createdAt: Date.now() - 20*86400000});
  }
  // Los primeros autos con historial ya tienen su sticker; uno se rompió y se reemplazó.
  const conTrabajos = vehiculos.filter(v => trabajos.some(t => t.vehiculoId === v.id)).slice(0, 8);
  conTrabajos.forEach((v, k) => {
    Object.assign(stickers[k], {estado:'asignado', vehiculoId:v.id, asignadoAt: Date.now() - (40 - k*4)*86400000});
  });
  Object.assign(stickers[8], {estado:'baja', bajaAt: Date.now() - 6*86400000, motivoBaja:'Se rompió al cambiar el parabrisas'});
  lsWriteAll('stickers', stickers);
  localStorage.setItem(lsKey('seeded_qr'), '1');
}
