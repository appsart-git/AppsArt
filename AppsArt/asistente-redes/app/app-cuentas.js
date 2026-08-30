'use strict';
/* ===================== CUENTAS (perfiles de marca) =====================
   Esquema genérico a propósito: nada de estos campos referencia a un negocio
   puntual. Así, el día que se ofrezca esta app a un cliente de AppsArt, alta
   de una cuenta nueva = completar este formulario, sin tocar código. */

function renderCuentas(){
  const cuentas = state.cuentas.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  document.getElementById('main').innerHTML = `
    <div class="section-head">
      <h1>Cuentas</h1>
      <div style="display:flex; gap:8px;">
        <button class="btn" data-action="importarCuentasSemilla">Importar las 4 iniciales</button>
        <button class="btn btn-primary" data-action="nuevaCuenta">+ Nueva cuenta</button>
      </div>
    </div>
    ${cuentas.length===0 ? `<div class="empty">Todavía no cargaste ninguna cuenta. Creá la primera con "+ Nueva cuenta", o importá las 4 de ejemplo (Tecno Art, AppsArt, Entre PyMES, Quinta Tres Estaciones) con el botón de arriba.</div>` : `
    <div class="grid-cards" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">
      ${cuentas.map(c => `
        <div class="card">
          <div style="display:flex; align-items:start; justify-content:space-between; gap:8px;">
            <div>
              <h3 style="font-size:15.5px;">${esc(c.nombre||'(sin nombre)')}</h3>
              <div class="muted" style="font-size:12.5px;">${esc(c.rubro||'')}</div>
            </div>
            <span class="pill ${c.activo!==false?'pill-ok':'pill-bad'}">${c.activo!==false?'Activa':'Pausada'}</span>
          </div>
          <div style="margin:10px 0; font-size:12.5px; color:var(--text-muted); display:flex; flex-direction:column; gap:3px;">
            <div><b style="color:var(--text);">Medio:</b> ${c.mediaType==='imagen+video' ? 'Imagen + video' : 'Solo imagen'}</div>
            <div><b style="color:var(--text);">Cadencia:</b> cada ${c.cadenciaDias||'—'} día(s)</div>
            <div><b style="color:var(--text);">Última generación:</b> ${c.ultimaGeneracion ? fmtDate(c.ultimaGeneracion) : 'nunca'}</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm" data-action="editarCuenta" data-id="${c.id}">Editar</button>
            <button class="btn btn-sm" data-action="toggleActivoCuenta" data-id="${c.id}">${c.activo!==false?'Pausar':'Reactivar'}</button>
            <button class="btn btn-sm btn-danger" data-action="eliminarCuenta" data-id="${c.id}">Eliminar</button>
          </div>
        </div>
      `).join('')}
    </div>`}
  `;
}

function cuentaFormHtml(c){
  c = c || {};
  return `
    <div class="modal-head"><h2>${c.id?'Editar cuenta':'Nueva cuenta'}</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="row2">
      <div class="field"><label>Nombre</label><input id="cf_nombre" value="${esc(c.nombre||'')}"></div>
      <div class="field"><label>Rubro</label><input id="cf_rubro" value="${esc(c.rubro||'')}"></div>
    </div>
    <div class="field"><label>Descripción del negocio</label><textarea id="cf_descripcionNegocio" rows="2">${esc(c.descripcionNegocio||'')}</textarea></div>
    <div class="field"><label>Voz de marca / tono</label><textarea id="cf_vozMarca" rows="2" placeholder="Ej: profesional pero cercano, directo, con humor...">${esc(c.vozMarca||'')}</textarea></div>
    <div class="field"><label>Público objetivo</label><textarea id="cf_publicoObjetivo" rows="2">${esc(c.publicoObjetivo||'')}</textarea></div>
    <div class="field"><label>Identidad visual (colores, tipografía, estilo)</label><textarea id="cf_identidadVisual" rows="2" placeholder="Ej: fondo negro, acento naranja quemado, tipografía bold geométrica...">${esc(c.identidadVisual||'')}</textarea></div>
    <div class="field"><label>Paleta (colores separados por coma)</label><input id="cf_paleta" value="${esc((c.paleta||[]).join(', '))}" placeholder="#0d0d0d, #d9762f, #ffffff"></div>
    <div class="field"><label>Temas / colecciones de contenido (uno por línea, se rotan)</label><textarea id="cf_temasContenido" rows="4">${esc((c.temasContenido||[]).join('\n'))}</textarea></div>
    <div class="field"><label>Hashtags base (separados por coma)</label><input id="cf_hashtagsBase" value="${esc((c.hashtagsBase||[]).join(', '))}"></div>
    <div class="row2">
      <div class="field"><label>Web</label><input id="cf_webUrl" value="${esc(c.webUrl||'')}"></div>
      <div class="field"><label>Link en bio</label><input id="cf_linkBio" value="${esc(c.linkBio||'')}"></div>
    </div>
    <div class="row2">
      <div class="field">
        <label>Tipo de contenido</label>
        <select id="cf_mediaType">
          ${MEDIA_TYPES.map(m=>`<option value="${m.id}" ${c.mediaType===m.id?'selected':''}>${m.label}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Cadencia (cada cuántos días genera)</label><input id="cf_cadenciaDias" type="number" min="1" value="${c.cadenciaDias||3}"></div>
    </div>
    <div class="field"><label>Instrucciones extra para la IA (opcional)</label><textarea id="cf_promptExtra" rows="2" placeholder="Ej: nunca superponer texto sobre la imagen...">${esc(c.promptExtra||'')}</textarea></div>
    <label style="display:flex; align-items:center; gap:8px; text-transform:none; font-size:13.5px; color:var(--text); margin-top:4px;">
      <input type="checkbox" id="cf_activo" style="width:auto;" ${c.activo!==false?'checked':''}> Cuenta activa (genera contenido)
    </label>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarCuenta" data-id="${c.id||''}">Guardar</button>
    </div>
  `;
}

Object.assign(actions, {
  importarCuentasSemilla(el){
    withBusyButton(el, 'Importando…', async () => {
      const res = await fetch('./seed-cuentas.json');
      const seed = await res.json();
      const existentes = new Set(state.cuentas.map(c => c.slug));
      const ref = collectionRef('cuentas');
      const nuevas = seed.filter(c => !existentes.has(slugify(c.nombre)));
      if(nuevas.length===0){ toast('Las 4 cuentas ya estaban cargadas.'); return; }
      markSaving();
      await Promise.all(nuevas.map(c => ref.add(Object.assign({
        slug: slugify(c.nombre), ultimoTemaIndex: 0, ultimaGeneracion: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }, c))));
      doneSaving();
      toast(`Se importaron ${nuevas.length} cuenta(s).`);
    }).catch(e => { console.error(e); toast('No se pudo importar (¿existe seed-cuentas.json?).'); });
  },
  nuevaCuenta(){ openModal(cuentaFormHtml(null), {wide:true}); },
  editarCuenta(el){ openModal(cuentaFormHtml(findCuenta(el.dataset.id)), {wide:true}); },
  guardarCuenta(el){
    const nombre = document.getElementById('cf_nombre').value.trim();
    if(!nombre){ toast('Poné un nombre para la cuenta.'); return; }
    const data = {
      nombre,
      slug: slugify(nombre),
      rubro: document.getElementById('cf_rubro').value.trim(),
      descripcionNegocio: document.getElementById('cf_descripcionNegocio').value.trim(),
      vozMarca: document.getElementById('cf_vozMarca').value.trim(),
      publicoObjetivo: document.getElementById('cf_publicoObjetivo').value.trim(),
      identidadVisual: document.getElementById('cf_identidadVisual').value.trim(),
      paleta: document.getElementById('cf_paleta').value.split(',').map(s=>s.trim()).filter(Boolean),
      temasContenido: document.getElementById('cf_temasContenido').value.split('\n').map(s=>s.trim()).filter(Boolean),
      hashtagsBase: document.getElementById('cf_hashtagsBase').value.split(',').map(s=>s.trim()).filter(Boolean),
      webUrl: document.getElementById('cf_webUrl').value.trim(),
      linkBio: document.getElementById('cf_linkBio').value.trim(),
      mediaType: document.getElementById('cf_mediaType').value,
      cadenciaDias: Number(document.getElementById('cf_cadenciaDias').value) || 3,
      promptExtra: document.getElementById('cf_promptExtra').value.trim(),
      activo: document.getElementById('cf_activo').checked,
      updatedAt: new Date().toISOString()
    };
    const id = el.dataset.id;
    markSaving();
    const ref = collectionRef('cuentas');
    const p = id
      ? ref.update(id, data)
      : ref.add(Object.assign({ultimoTemaIndex:0, ultimaGeneracion:null, createdAt:new Date().toISOString()}, data));
    p.then(()=>{ doneSaving(); closeModal(); toast('Cuenta guardada.'); }).catch(saveError);
  },
  toggleActivoCuenta(el){
    const c = findCuenta(el.dataset.id); if(!c) return;
    markSaving();
    collectionRef('cuentas').update(c.id, {activo: c.activo===false}).then(doneSaving).catch(saveError);
  },
  eliminarCuenta(el){
    const c = findCuenta(el.dataset.id); if(!c) return;
    confirmDialog(`¿Eliminar la cuenta "${c.nombre}"? El contenido ya generado para ella no se borra.`, () => {
      markSaving();
      collectionRef('cuentas').remove(c.id).then(doneSaving).catch(saveError);
    });
  }
});
