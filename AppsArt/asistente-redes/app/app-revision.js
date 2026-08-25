'use strict';
/* ===================== REVISIÓN (pantalla principal) =====================
   Acá el usuario aprueba/descarta lo que generó el GitHub Action y lo
   descarga para publicarlo a mano. Esta pantalla nunca llama a ninguna
   API de IA ni a la API de Instagram — solo lee/escribe Firestore. */

function contenidoFiltrado(){
  return state.contenido.filter(c => {
    if(state.filtroRevisionCuenta!=='todas' && c.cuentaId!==state.filtroRevisionCuenta) return false;
    if(state.filtroRevisionEstado!=='todos' && (c.estado||'pendiente')!==state.filtroRevisionEstado) return false;
    return true;
  }).sort((a,b)=> new Date(b.generadoEn||0) - new Date(a.generadoEn||0));
}

function renderRevision(){
  const items = contenidoFiltrado();
  const conteoPend = state.contenido.filter(c=>(c.estado||'pendiente')==='pendiente').length;

  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Revisión</h1>
      ${conteoPend>0 ? `<span class="pill pill-warn">${conteoPend} pendiente${conteoPend===1?'':'s'}</span>` : ''}
    </div>

    <div class="chiprow">
      <span class="chip ${state.filtroRevisionCuenta==='todas'?'active':''}" data-action="filtroRevCuenta" data-id="todas">Todas las cuentas</span>
      ${state.cuentas.map(c=>`<span class="chip ${state.filtroRevisionCuenta===c.id?'active':''}" data-action="filtroRevCuenta" data-id="${c.id}">${esc(c.nombre)}</span>`).join('')}
    </div>

    <div class="tabs">
      ${ESTADOS.concat([{id:'todos',label:'Todos'}]).map(e=>`<div class="tab ${state.filtroRevisionEstado===e.id?'active':''}" data-action="filtroRevEstado" data-id="${e.id}">${e.label}</div>`).join('')}
    </div>

    ${items.length===0 ? `<div class="empty">No hay contenido en este filtro. Cuando el generador corra vas a ver las piezas nuevas acá.</div>` : `
    <div class="contenido-grid">${items.map(renderContenidoCard).join('')}</div>`}
  `;
}

function renderContenidoCard(c){
  const cuenta = findCuenta(c.cuentaId);
  const estado = c.estado || 'pendiente';
  let mediaHtml = `<div class="cnt-noimg">Sin media todavía</div>`;
  if(c.tipo==='carrusel' && Array.isArray(c.mediaUrls) && c.mediaUrls.length>0){
    mediaHtml = `
      <div class="cnt-carrusel">${c.mediaUrls.map((url,i)=>
        `<img src="${esc(url)}" alt="${esc(c.tema||'')} — lámina ${i+1}">`).join('')}</div>
      ${c.mediaUrls.length>1 ? `<span class="cnt-carrusel-badge">⇆ 1/${c.mediaUrls.length} — deslizá para ver más</span>` : ''}
    `;
  } else if(c.mediaUrl){
    mediaHtml = c.tipo==='video'
      ? `<video src="${esc(c.mediaUrl)}" ${c.thumbnailUrl?`poster="${esc(c.thumbnailUrl)}"`:''} controls preload="metadata"></video>`
      : `<img src="${esc(c.mediaUrl)}" alt="${esc(c.tema||'')}">`;
  }

  const botones = [];
  if(estado==='pendiente'){
    botones.push(`<button class="btn btn-sm btn-primary" data-action="aprobarContenido" data-id="${c.id}">Aprobar</button>`);
    botones.push(`<button class="btn btn-sm btn-danger" data-action="descartarContenido" data-id="${c.id}">Descartar</button>`);
  } else if(estado==='aprobado'){
    botones.push(`<button class="btn btn-sm btn-primary" data-action="marcarPublicado" data-id="${c.id}">Marcar publicado</button>`);
    botones.push(`<button class="btn btn-sm btn-danger" data-action="descartarContenido" data-id="${c.id}">Descartar</button>`);
  } else if(estado==='descartado' || estado==='error'){
    botones.push(`<button class="btn btn-sm" data-action="reabrirContenido" data-id="${c.id}">Volver a pendiente</button>`);
  }
  if(c.mediaUrl) botones.push(`<button class="btn btn-sm" data-action="descargarContenido" data-id="${c.id}">⬇ Descargar</button>`);
  if(estado!=='publicado') botones.push(`<button class="btn btn-sm" data-action="editarCaption" data-id="${c.id}">Editar caption</button>`);

  return `
    <div class="cnt-card">
      <div class="cnt-media">${mediaHtml}</div>
      <div class="cnt-body">
        <div class="cnt-top">
          <span class="cnt-cuenta">${esc(cuenta ? cuenta.nombre : '(cuenta eliminada)')}</span>
          ${pillEstado(estado)}
        </div>
        <div class="cnt-tema">${esc(c.tema||'')} · ${c.tipo==='video'?'Video':c.tipo==='carrusel'?`Carrusel (${(c.mediaUrls||[]).length} láminas)`:'Imagen'}</div>
        <div class="cnt-caption">${esc(c.caption||'(sin caption)')}</div>
        ${c.estado==='error' && c.errorGeneracion ? `<div class="muted" style="color:var(--red); font-size:12px;">Error: ${esc(c.errorGeneracion)}</div>` : ''}
        <div class="cnt-fecha">Generado: ${c.generadoEn ? fmtDate(c.generadoEn) : '—'}</div>
        <div class="cnt-actions">${botones.join('')}</div>
      </div>
    </div>
  `;
}

function findContenido(id){ return state.contenido.find(c=>c.id===id); }

Object.assign(actions, {
  filtroRevCuenta(el){ state.filtroRevisionCuenta = el.dataset.id; render(); },
  filtroRevEstado(el){ state.filtroRevisionEstado = el.dataset.id; render(); },
  aprobarContenido(el){
    markSaving();
    collectionRef('contenido').update(el.dataset.id, {estado:'aprobado', revisadoEn:new Date().toISOString()}).then(doneSaving).catch(saveError);
  },
  descartarContenido(el){
    markSaving();
    collectionRef('contenido').update(el.dataset.id, {estado:'descartado', revisadoEn:new Date().toISOString()}).then(doneSaving).catch(saveError);
  },
  reabrirContenido(el){
    markSaving();
    collectionRef('contenido').update(el.dataset.id, {estado:'pendiente', revisadoEn:new Date().toISOString()}).then(doneSaving).catch(saveError);
  },
  marcarPublicado(el){
    markSaving();
    collectionRef('contenido').update(el.dataset.id, {estado:'publicado', revisadoEn:new Date().toISOString()}).then(doneSaving).catch(saveError);
  },
  descargarContenido(el){
    const c = findContenido(el.dataset.id); if(!c || !c.mediaUrl) return;
    const cuenta = findCuenta(c.cuentaId);
    const base = `${slugify(cuenta?cuenta.nombre:'contenido')}-${(c.tema||c.id)}`;
    if(c.tipo==='carrusel' && Array.isArray(c.mediaUrls)){
      c.mediaUrls.forEach((url,i) => downloadUrl(url, `${base}-lamina-${i+1}.png`));
      return;
    }
    const ext = c.tipo==='video' ? 'mp4' : 'png';
    downloadUrl(c.mediaUrl, `${base}.${ext}`);
  },
  editarCaption(el){
    const c = findContenido(el.dataset.id); if(!c) return;
    openModal(`
      <div class="modal-head"><h2>Editar caption</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
      <div class="field"><textarea id="editCaptionInput" rows="8">${esc(c.caption||'')}</textarea></div>
      <div class="modal-actions">
        <button class="btn" data-action="closeModal">Cancelar</button>
        <button class="btn btn-primary" data-action="guardarCaption" data-id="${c.id}">Guardar</button>
      </div>
    `);
  },
  guardarCaption(el){
    const caption = document.getElementById('editCaptionInput').value;
    markSaving();
    collectionRef('contenido').update(el.dataset.id, {caption, notasRevision:'editado a mano'}).then(()=>{
      doneSaving(); closeModal(); toast('Caption actualizado.');
    }).catch(saveError);
  }
});
