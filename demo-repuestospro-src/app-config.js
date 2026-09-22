'use strict';
/* ===================== CONFIGURACIÓN ===================== */

function renderConfig(){
  const n = state.negocio;
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Configuración</h1></div>
    <div class="card" style="max-width:560px; margin-bottom:18px;">
      <h3 style="font-size:14px;">Datos del negocio</h3>
      <p class="muted" style="font-size:12.5px;">Aparecen en el comprobante de venta.</p>
      <div class="field"><label>Nombre</label><input id="cfg_nombre" value="${esc(n.nombre||'')}"></div>
      <div class="row2">
        <div class="field"><label>Dirección</label><input id="cfg_direccion" value="${esc(n.direccion||'')}"></div>
        <div class="field"><label>Teléfono</label><input id="cfg_telefono" value="${esc(n.telefono||'')}"></div>
      </div>
      <div class="field"><label>CUIT (opcional)</label><input id="cfg_cuit" value="${esc(n.cuit||'')}"></div>
      <button class="btn btn-primary" data-action="guardarNegocio">Guardar datos</button>
    </div>
    <div class="card" style="max-width:560px;">
      <h3 style="font-size:14px;">Base de datos</h3>
      <p class="muted" style="font-size:13px;">Modo actual: <b>Local (solo este navegador)</b></p>
      <p class="muted" style="font-size:12.5px;">Esta es la demo de campaña: los datos quedan guardados solo en este navegador, con información de ejemplo precargada. En un cliente real activamos la base de datos compartida (Firebase) como parte del servicio, para que el mostrador y la PC vean lo mismo en tiempo real.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn" data-action="exportarRespaldo">⬇ Exportar respaldo (JSON)</button>
        <button class="btn btn-danger" data-action="reiniciarDemo">↺ Reiniciar datos de ejemplo</button>
      </div>
    </div>`;
}

Object.assign(actions, {
  guardarNegocio(){
    state.negocio = {
      nombre: document.getElementById('cfg_nombre').value.trim() || 'REPUESTOS PRO',
      direccion: document.getElementById('cfg_direccion').value.trim(),
      telefono: document.getElementById('cfg_telefono').value.trim(),
      cuit: document.getElementById('cfg_cuit').value.trim()
    };
    markSaving();
    configSet(state.negocio).then(doneSaving).catch(saveError);
    toast('Datos guardados.');
  },
  exportarRespaldo(){
    const dump = {};
    COLLECTIONS.forEach(c => dump[c] = state[c]);
    dump.negocio = state.negocio; dump.contadores = state.contadores;
    const blob = new Blob([JSON.stringify(dump, null, 2)], {type:'application/json'});
    downloadBlob(blob, 'repuestospro-respaldo-' + todayISO() + '.json');
  },
  reiniciarDemo(){
    confirmDialog('¿Reiniciar la demo con los datos de ejemplo originales? Se pierde todo lo que hayas cargado en este navegador.', () => {
      COLLECTIONS.forEach(c => localStorage.removeItem(lsKey(c)));
      localStorage.removeItem(lsKey('config_negocio'));
      localStorage.removeItem(lsKey('config_contadores'));
      localStorage.removeItem(lsKey('seeded'));
      location.reload();
    });
  }
});
