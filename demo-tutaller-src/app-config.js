'use strict';
/* ===================== CONFIGURACIÓN ===================== */

function renderConfig(){
  const n = state.negocio;
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Configuración</h1></div>
    <div class="panel" style="max-width:560px; margin-bottom:16px;">
      <h2>Datos del taller</h2>
      <p class="muted small" style="margin-top:-8px;">Aparecen en el informe de trabajo y en los mensajes de WhatsApp.</p>
      <div class="field"><label>Nombre</label><input id="cfg_nombre" value="${esc(n.nombre||'')}"></div>
      <div class="row2">
        <div class="field"><label>Dirección</label><input id="cfg_direccion" value="${esc(n.direccion||'')}"></div>
        <div class="field"><label>Teléfono</label><input id="cfg_telefono" value="${esc(n.telefono||'')}"></div>
      </div>
      <button class="btn btn-primary" data-action="guardarNegocio">Guardar datos</button>
    </div>

    <div class="panel" style="max-width:560px; margin-bottom:16px;">
      <h2>Recompra y recordatorios</h2>
      <p class="muted small" style="margin-top:-8px;">Define cada cuánto se avisa a un cliente que le toca el próximo service, y el texto de los mensajes que arma la sección "Recompra".</p>
      <div class="field" style="max-width:220px;"><label>Intervalo de service (meses)</label><input id="cfg_intervalo" type="number" min="1" value="${esc(n.intervaloServicioMeses||6)}"></div>
      <div class="field"><label>Mensaje de recordatorio de service</label><textarea id="cfg_msgRecordatorio" rows="3">${esc(n.mensajeRecordatorio||'')}</textarea></div>
      <div class="field"><label>Mensaje de promoción mensual</label><textarea id="cfg_msgPromo" rows="3">${esc(n.mensajePromo||'')}</textarea></div>
      <div class="field"><label>Mensaje de aviso de estado (Estado autos)</label><textarea id="cfg_msgEstado" rows="3">${esc(n.mensajeEstado||'')}</textarea></div>
      <p class="small muted" style="margin-top:-6px;">Podés usar <code>{nombre}</code>, <code>{vehiculo}</code>, <code>{taller}</code> y, en el aviso de estado, <code>{estado}</code> — se completan solos al generar cada mensaje.</p>
      <button class="btn btn-primary" data-action="guardarNegocio">Guardar datos</button>
    </div>

    <div class="panel" style="max-width:560px;">
      <h2>Base de datos</h2>
      <p class="muted small" style="margin-top:-8px;">Modo actual: <b>${backendMode==='firebase' ? 'Compartida entre dispositivos' : 'Local (solo este dispositivo)'}</b></p>
      ${backendMode==='firebase' ? `
        <p class="muted small">El mostrador y el celular del taller ven y editan los mismos clientes y trabajos en tiempo real.</p>
      ` : `
        <p class="muted small">Esta es la demo de campaña: los datos quedan guardados solo en este navegador, con información de ejemplo precargada. En un taller real activamos la base de datos compartida como parte del servicio — no hace falta que el taller haga nada acá.</p>
      `}
      <div class="btn-row">
        <button class="btn" data-action="exportarRespaldo">⬇ Exportar respaldo (JSON)</button>
        <button class="btn btn-danger" data-action="reiniciarDemo">↺ Reiniciar datos de ejemplo</button>
      </div>
    </div>
    <div class="config-credit">by <img src="./appsart-brand-claro.png" alt="AppsArt"></div>`;
}

Object.assign(actions, {
  guardarNegocio(){
    state.negocio = Object.assign({}, state.negocio, {
      nombre: document.getElementById('cfg_nombre').value.trim() || 'TU TALLER',
      direccion: document.getElementById('cfg_direccion').value.trim(),
      telefono: document.getElementById('cfg_telefono').value.trim(),
      intervaloServicioMeses: parseInt(document.getElementById('cfg_intervalo').value, 10) || 6,
      mensajeRecordatorio: document.getElementById('cfg_msgRecordatorio').value,
      mensajePromo: document.getElementById('cfg_msgPromo').value,
      mensajeEstado: document.getElementById('cfg_msgEstado').value
    });
    markSaving();
    configSet(state.negocio).then(doneSaving).catch(saveError);
    toast('Datos guardados.');
  },
  exportarRespaldo(){
    const dump = {};
    COLLECTIONS.forEach(c => dump[c] = state[c]);
    dump.negocio = state.negocio;
    const blob = new Blob([JSON.stringify(dump, null, 2)], {type:'application/json'});
    downloadBlob(blob, 'tutaller-respaldo-' + todayISO() + '.json');
  },
  reiniciarDemo(){
    confirmDialog('¿Reiniciar la demo con los datos de ejemplo originales? Se pierde todo lo que hayas cargado en este navegador.', () => {
      COLLECTIONS.forEach(c => localStorage.removeItem(lsKey(c)));
      localStorage.removeItem(lsKey('config_negocio'));
      localStorage.removeItem(lsKey('seeded'));
      location.reload();
    });
  }
});
