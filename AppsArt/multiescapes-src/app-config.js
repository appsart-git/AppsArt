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
  }
});
