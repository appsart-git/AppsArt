'use strict';
/* ===================== CONFIGURACIÓN ===================== */

function renderConfig(){
  const n = state.negocio;
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Configuración</h1></div>
    <div class="panel" style="max-width:520px; margin-bottom:16px;">
      <h2>Datos del taller</h2>
      <p class="muted small" style="margin-top:-8px;">Aparecen en el informe de trabajo.</p>
      <div class="field"><label>Nombre</label><input id="cfg_nombre" value="${esc(n.nombre||'')}"></div>
      <div class="row2">
        <div class="field"><label>Dirección</label><input id="cfg_direccion" value="${esc(n.direccion||'')}"></div>
        <div class="field"><label>Teléfono</label><input id="cfg_telefono" value="${esc(n.telefono||'')}"></div>
      </div>
      <button class="btn btn-primary" data-action="guardarNegocio">Guardar datos</button>
    </div>
    <div class="panel" style="max-width:520px;">
      <h2>Base de datos</h2>
      <p class="muted small" style="margin-top:-8px;">Modo actual: <b>${backendMode==='firebase' ? 'Compartida entre dispositivos' : 'Local (solo este dispositivo)'}</b></p>
      ${backendMode==='firebase' ? `
        <p class="muted small">El mostrador y el celular del taller ven y editan los mismos clientes y trabajos en tiempo real.</p>
      ` : `
        <p class="muted small">Por ahora los datos quedan guardados solo en este dispositivo. La base de datos compartida la activamos nosotros como parte del servicio — no hace falta que hagas nada acá.</p>
      `}
      <button class="btn" data-action="exportarRespaldo">⬇ Exportar respaldo (JSON)</button>
    </div>
    ${backendMode==='firebase' ? `
    <div class="panel" style="max-width:520px;">
      <h2>PIN de acceso</h2>
      <p class="muted small" style="margin-top:-8px;">Es el mismo PIN para entrar desde cualquier celular o computadora del taller. Podés cambiarlo cuando quieras.</p>
      <button class="btn" data-action="cambiarPin">Cambiar PIN</button>
    </div>` : ''}
    <div class="config-credit">by <img src="./appsart-brand-claro.png" alt="AppsArt"></div>`;
}

function cambiarPinFormHtml(){
  return `
    <div class="modal-head"><h2>Cambiar PIN de acceso</h2><button class="modal-close" data-action="closeModal">&times;</button></div>
    <div class="field"><label>PIN nuevo</label><input id="cp_nuevo" type="tel" inputmode="numeric" autocomplete="off" placeholder="••••"></div>
    <div class="field"><label>Repetí el PIN nuevo</label><input id="cp_repetir" type="tel" inputmode="numeric" autocomplete="off" placeholder="••••"></div>
    <p class="muted small" id="cp_error" style="display:none; color:var(--red-600);"></p>
    <div class="modal-actions">
      <button class="btn" data-action="closeModal">Cancelar</button>
      <button class="btn btn-primary" data-action="guardarNuevoPin">Guardar PIN</button>
    </div>`;
}

Object.assign(actions, {
  guardarNegocio(){
    state.negocio = {
      nombre: document.getElementById('cfg_nombre').value.trim() || 'MULTIESCAPES',
      direccion: document.getElementById('cfg_direccion').value.trim(),
      telefono: document.getElementById('cfg_telefono').value.trim()
    };
    markSaving();
    configSet(state.negocio).then(doneSaving).catch(saveError);
    toast('Datos guardados.');
  },
  exportarRespaldo(){
    const dump = {};
    COLLECTIONS.forEach(c => dump[c] = state[c]);
    dump.negocio = state.negocio;
    const blob = new Blob([JSON.stringify(dump, null, 2)], {type:'application/json'});
    downloadBlob(blob, 'multiescapes-respaldo-' + todayISO() + '.json');
  },
  cambiarPin(){ openModal(cambiarPinFormHtml()); },
  async guardarNuevoPin(){
    const nuevo = document.getElementById('cp_nuevo').value.trim();
    const repetir = document.getElementById('cp_repetir').value.trim();
    const errEl = document.getElementById('cp_error');
    errEl.style.display = 'none';
    if(nuevo.length < 4){ errEl.textContent = 'El PIN tiene que tener al menos 4 caracteres.'; errEl.style.display = 'block'; return; }
    if(nuevo !== repetir){ errEl.textContent = 'Los dos PIN no coinciden.'; errEl.style.display = 'block'; return; }
    const hash = await sha256Hex(nuevo);
    try{
      await db.collection('config').doc('acceso').set({pinHash: hash}, {merge:true});
      localStorage.setItem(lsKey('pinHashCache'), hash);
      closeModal();
      toast('PIN actualizado. Usalo la próxima vez que entres desde cualquier dispositivo.');
    }catch(e){
      errEl.textContent = 'No se pudo guardar. Revisá tu conexión e intentá de nuevo.';
      errEl.style.display = 'block';
    }
  }
});
