'use strict';
/* ===================== CONFIGURACIÓN ===================== */

function renderConfig(){
  const cfg = state.appConfig || {};
  document.getElementById('main').innerHTML = `
    <div class="section-head"><h1>Configuración</h1></div>

    <div class="card" style="max-width:560px; margin-bottom:18px;">
      <h3 style="font-size:14px;">Notificación al celular</h3>
      <p class="muted" style="font-size:12.5px;">Este dato es solo de referencia acá (no es secreto real): el mismo topic tiene que estar cargado como secret <code>NTFY_TOPIC</code> en GitHub, y vos suscripto a él en la app ntfy de tu celular.</p>
      <div class="field"><label>Topic de ntfy.sh</label><input id="cfg_ntfyTopic" value="${esc(cfg.ntfyTopic||'')}" placeholder="ej: asistente-redes-martin-8f2a"></div>
      <button class="btn btn-primary" data-action="guardarAppConfig">Guardar</button>
    </div>

    <div class="card" style="max-width:560px; margin-bottom:18px;">
      <h3 style="font-size:14px;">Base de datos</h3>
      <p class="muted" style="font-size:13px;">Modo actual: <b>${backendMode==='firebase' ? 'Firebase (Firestore + Storage)' : 'Local (solo este navegador)'}</b></p>
      ${backendMode!=='firebase' ? `
        <p class="muted" style="font-size:12.5px;">Estás en modo local: solo vos ves estos datos en este navegador, y el generador de GitHub Actions no puede escribir acá. Conectá Firebase para que todo funcione de punta a punta.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn" data-action="exportarRespaldo">⬇ Exportar respaldo (JSON)</button>
          <button class="btn btn-primary" data-action="irAConectarFirebase">Conectar Firebase</button>
        </div>` : `
        <p class="muted" style="font-size:12.5px;">Conectado. Recordá que además de Firestore, el proyecto necesita <b>Storage</b> habilitado (ahí se guardan las imágenes/videos que sube el generador).</p>
      `}
    </div>

    <div class="card" style="max-width:560px;">
      <h3 style="font-size:14px;">Checklist del generador (GitHub Actions)</h3>
      <p class="muted" style="font-size:12.5px;">Este dashboard nunca llama a las APIs de IA — eso corre en un GitHub Action programado. Para que ande necesita estos secrets cargados en el repo (Settings → Secrets and variables → Actions):</p>
      <ul class="muted" style="font-size:12.5px; line-height:1.7; padding-left:18px;">
        <li><code>FIREBASE_SERVICE_ACCOUNT</code> — credencial admin del proyecto Firebase (JSON completo)</li>
        <li><code>FIREBASE_STORAGE_BUCKET</code></li>
        <li><code>FIREBASE_PROJECT_ID</code> — para el deploy del dashboard a Hosting</li>
        <li><code>ANTHROPIC_API_KEY</code> — textos</li>
        <li><code>OPENAI_API_KEY</code> — imágenes</li>
        <li><code>RUNWAY_API_KEY</code> — video (solo cuentas con video)</li>
        <li><code>ELEVENLABS_API_KEY</code> — locución (solo cuentas con video)</li>
        <li><code>NTFY_TOPIC</code> — mismo valor que pegaste arriba</li>
      </ul>
      <p class="muted" style="font-size:12.5px;">Detalle completo en <code>asistente-redes/REQUISITOS.md</code>.</p>
    </div>
  `;
}

Object.assign(actions, {
  guardarAppConfig(){
    const data = {ntfyTopic: document.getElementById('cfg_ntfyTopic').value.trim()};
    state.appConfig = Object.assign(state.appConfig||{}, data);
    markSaving();
    configSet(data).then(doneSaving).catch(saveError);
    toast('Configuración guardada.');
  },
  exportarRespaldo(){
    const dump = {};
    COLLECTIONS.forEach(c => dump[c] = state[c]);
    dump.appConfig = state.appConfig;
    const blob = new Blob([JSON.stringify(dump, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'asistente-redes-respaldo-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  },
  irAConectarFirebase(){
    localStorage.removeItem(lsKey('useLocalMode'));
    showSetupScreen();
    document.getElementById('app').classList.remove('ready');
  }
});
