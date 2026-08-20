const content = document.getElementById("content");
let unsubEnfermeros = null;
let unsubPedidos = null;
let unsubTarifas = null;
let enfermeros = [];
let pedidos = [];
let tarifas = { precios: {}, comisionPorcentaje: 0 };
let tabActual = "enfermeros";

/* ===================== Login ===================== */
function renderLogin() {
  content.innerHTML = `
    <div class="auth-wrap">
      <div class="card" style="width:100%; max-width:380px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <div class="brand-icon">🔒</div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Panel de administración</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Acceso restringido al equipo de CUIDAR+.</p>
        <form id="form-login">
          <div class="field"><label>Email</label><input type="email" id="li-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="li-password" required /></div>
          <div id="li-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="li-submit">Ingresar</button>
        </form>
        ${forgotPasswordHTML()}
        <p class="muted" style="text-align:center; margin-top:16px; font-size:13px;">
          <a href="index.html" style="color:var(--teal-dark); font-weight:600;">← Volver al inicio</a>
        </p>
      </div>
    </div>
  `;
  document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("li-submit");
    const errEl = document.getElementById("li-error");
    errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Ingresando…";
    try {
      await EnfApp.auth.signInWithEmailAndPassword(
        document.getElementById("li-email").value,
        document.getElementById("li-password").value
      );
    } catch (err) {
      errEl.textContent = traducirErrorAuth(err);
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Ingresar";
    }
  });
  wireOlvideContrasena(EnfApp.auth);
}

function renderSinPermiso() {
  content.innerHTML = `
    <div class="auth-wrap">
      <div class="card" style="width:100%; max-width:420px;">
        <div style="font-weight:600; margin-bottom:8px;">Esta cuenta no tiene permisos de administrador</div>
        <p class="muted" style="margin-bottom:16px;">
          Para dar de alta un admin: creá el usuario en Firebase Console → Authentication,
          copiá su UID, y agregá un documento con ese ID en la colección
          <code>admins</code> de Firestore (ver README).
        </p>
        <button class="btn-ghost" id="btn-logout" style="width:100%;">Cerrar sesión</button>
      </div>
    </div>
  `;
  document.getElementById("btn-logout").addEventListener("click", () => EnfApp.auth.signOut());
}

/* ===================== Dashboard ===================== */
function renderDashboard() {
  content.innerHTML = `
    <div class="container" style="max-width:720px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="font-family:var(--font-display); font-size:19px; font-weight:600;">Panel de administración</div>
        <button class="btn-icon" id="btn-logout">Salir</button>
      </div>
      <div id="push-status" style="margin-bottom:16px;"></div>
      <div class="tabs">
        <button class="${tabActual === "enfermeros" ? "btn-primary" : "btn-ghost"}" id="tab-enfermeros">Enfermeros</button>
        <button class="${tabActual === "pedidos" ? "btn-primary" : "btn-ghost"}" id="tab-pedidos">Pedidos</button>
        <button class="${tabActual === "tarifas" ? "btn-primary" : "btn-ghost"}" id="tab-tarifas">Tarifas</button>
      </div>
      <div id="tab-content"></div>
      <div class="by-appsart">by AppsArt</div>
    </div>
  `;
  document.getElementById("btn-logout").addEventListener("click", () => EnfApp.auth.signOut());
  renderPushStatus("adminTokens", "Activar avisos de enfermero/pedido nuevo");
  document.getElementById("tab-enfermeros").addEventListener("click", () => {
    tabActual = "enfermeros";
    renderDashboard();
  });
  document.getElementById("tab-pedidos").addEventListener("click", () => {
    tabActual = "pedidos";
    renderDashboard();
  });
  document.getElementById("tab-tarifas").addEventListener("click", () => {
    tabActual = "tarifas";
    renderDashboard();
  });
  renderTabContent();
}

function renderTabContent() {
  const el = document.getElementById("tab-content");
  if (!el) return;
  if (tabActual === "enfermeros") renderTabEnfermeros(el);
  else if (tabActual === "pedidos") renderTabPedidos(el);
  else renderTabTarifas(el);
}

function renderTabEnfermeros(el) {
  if (enfermeros.length === 0) {
    el.innerHTML = `<div class="muted">Todavía no hay enfermeros registrados.</div>`;
    return;
  }
  el.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;">
    ${enfermeros
      .map(
        (e) => `
      <div class="card" data-enfermero-id="${e.id}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div id="foto-${e.id}" style="width:44px; height:44px; border-radius:10px; background:var(--surface-2); flex-shrink:0; overflow:hidden;"></div>
            <div>
              <div style="font-weight:600;">${escapeHTML(e.nombre)}</div>
              <div class="muted" style="font-size:13.5px;">Matrícula ${escapeHTML(e.matricula)} · ${escapeHTML(e.zona)} · ${escapeHTML(e.telefono)}</div>
              <div class="muted" style="font-size:13.5px;">Seguro de mala praxis: póliza ${e.seguroPoliza ? escapeHTML(e.seguroPoliza) : "(no cargada)"}</div>
            </div>
          </div>
          ${badgeHTML(e.estado)}
        </div>
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          ${e.matriculaArchivoPath ? `<button class="btn-icon btn-ver-archivo" data-path="${escapeHTML(e.matriculaArchivoPath)}" data-label="matrícula">Ver matrícula</button>` : ""}
          ${e.seguroArchivoPath ? `<button class="btn-icon btn-ver-archivo" data-path="${escapeHTML(e.seguroArchivoPath)}" data-label="certificado de seguro">Ver certificado de seguro</button>` : ""}
          ${e.estado !== "aprobado" ? `<button class="btn-primary btn-aprobar" style="width:auto; padding:8px 12px; font-size:13px;" data-id="${e.id}">Aprobar</button>` : ""}
          ${e.estado !== "rechazado" ? `<button class="btn-danger btn-rechazar" data-id="${e.id}">Rechazar</button>` : ""}
        </div>
      </div>
    `
      )
      .join("")}
  </div>`;

  enfermeros
    .filter((e) => e.fotoPerfilPath)
    .forEach(async (e) => {
      const fotoEl = document.getElementById(`foto-${e.id}`);
      if (!fotoEl) return;
      try {
        const url = await EnfApp.storage.ref(e.fotoPerfilPath).getDownloadURL();
        fotoEl.innerHTML = `<img src="${url}" alt="" style="width:100%; height:100%; object-fit:cover;" />`;
      } catch (err) {
        // sin foto disponible, se queda el placeholder vacío
      }
    });

  el.querySelectorAll(".btn-ver-archivo").forEach((btn) => {
    btn.addEventListener("click", async () => {
      // Hay que abrir la pestaña en el mismo instante del click (antes de cualquier
      // await) — si no, el navegador del celular (sobre todo Safari) la bloquea
      // silenciosamente por no considerarlo ya parte del gesto del usuario.
      const nuevaPestania = window.open("", "_blank", "noreferrer");
      const textoOriginal = btn.textContent;
      btn.textContent = "Abriendo…";
      try {
        const url = await EnfApp.storage.ref(btn.dataset.path).getDownloadURL();
        if (nuevaPestania) nuevaPestania.location.href = url;
        else location.href = url; // por si el navegador igual bloqueó la ventana en blanco
      } catch (err) {
        if (nuevaPestania) nuevaPestania.close();
        alert(`No se pudo abrir el ${btn.dataset.label}: ` + err.message);
      }
      btn.textContent = textoOriginal;
    });
  });
  el.querySelectorAll(".btn-aprobar").forEach((btn) => {
    btn.addEventListener("click", () => actualizarEnfermero(btn.dataset.id, "aprobado"));
  });
  el.querySelectorAll(".btn-rechazar").forEach((btn) => {
    btn.addEventListener("click", () => actualizarEnfermero(btn.dataset.id, "rechazado"));
  });
}

async function actualizarEnfermero(id, estado) {
  try {
    await EnfApp.db.collection("enfermeros").doc(id).update({ estado });
  } catch (err) {
    alert("No se pudo actualizar: " + err.message);
  }
}

function renderTabPedidos(el) {
  if (pedidos.length === 0) {
    el.innerHTML = `<div class="muted">Todavía no hay pedidos.</div>`;
    return;
  }
  const aprobados = enfermeros.filter((e) => e.estado === "aprobado");
  el.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;">
    ${pedidos
      .map(
        (p) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:600;">${escapeHTML(p.tipoServicio)}</div>
            <div class="muted" style="font-size:13.5px;">${escapeHTML(p.pacienteNombre)} · ${escapeHTML(p.pacienteTelefono)}</div>
            <div class="muted" style="font-size:13.5px;">${escapeHTML(p.zona)} · ${escapeHTML(p.fecha)} · ${escapeHTML(p.horario)}</div>
            ${p.direccion ? `<div style="font-size:13.5px; margin-top:2px;">📍 ${escapeHTML(p.direccion)}</div>` : ""}
            <div style="font-size:13.5px; margin-top:2px; font-weight:600;">
              ${formatMonto(p.precio)}
              ${p.precio != null ? `<span class="muted" style="font-weight:400;"> · comisión ${formatMonto(Math.round((p.precio * (tarifas.comisionPorcentaje || 0)) / 100))}</span>` : ""}
            </div>
          </div>
          ${badgeHTML(p.estado)}
        </div>
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <select class="sel-enfermero" data-id="${p.id}" style="padding:8px 10px; border-radius:8px; border:1.5px solid var(--border);">
            <option value="">Sin asignar</option>
            ${aprobados.map((a) => `<option value="${a.id}" ${p.enfermeroId === a.id ? "selected" : ""}>${escapeHTML(a.nombre)} (${escapeHTML(a.zona)})</option>`).join("")}
          </select>
          <select class="sel-estado" data-id="${p.id}" style="padding:8px 10px; border-radius:8px; border:1.5px solid var(--border);">
            ${ESTADOS_PEDIDO.map((estado) => `<option value="${estado}" ${p.estado === estado ? "selected" : ""}>${ESTADO_LABELS[estado]}</option>`).join("")}
          </select>
          <select class="sel-pago" data-id="${p.id}" style="padding:8px 10px; border-radius:8px; border:1.5px solid var(--border);">
            <option value="pendiente" ${p.pagoEstado === "pendiente" ? "selected" : ""}>Pago pendiente</option>
            <option value="pagado" ${p.pagoEstado === "pagado" ? "selected" : ""}>Pagado</option>
          </select>
        </div>
      </div>
    `
      )
      .join("")}
  </div>`;

  el.querySelectorAll(".sel-enfermero").forEach((sel) => {
    sel.addEventListener("change", () => {
      const enfermeroId = sel.value || null;
      actualizarPedido(sel.dataset.id, { enfermeroId, estado: enfermeroId ? "asignado" : "pendiente" });
    });
  });
  el.querySelectorAll(".sel-estado").forEach((sel) => {
    sel.addEventListener("change", () => actualizarPedido(sel.dataset.id, { estado: sel.value }));
  });
  el.querySelectorAll(".sel-pago").forEach((sel) => {
    sel.addEventListener("change", () => actualizarPedido(sel.dataset.id, { pagoEstado: sel.value }));
  });
}

async function actualizarPedido(id, campos) {
  try {
    await EnfApp.db.collection("pedidos").doc(id).update(campos);
  } catch (err) {
    alert("No se pudo actualizar: " + err.message);
  }
}

function renderTabTarifas(el) {
  el.innerHTML = `
    <form id="form-tarifas" class="card">
      <p class="muted" style="margin-top:0; font-size:13.5px;">
        Precio por tipo de servicio (se le muestra al paciente y al enfermero) y % de
        comisión de la plataforma. Un pedido nuevo toma el precio vigente en el momento
        de pedirse — cambiar un precio acá no afecta pedidos ya hechos.
      </p>
      ${TIPOS_SERVICIO.map(
        (t) => `
        <div class="field">
          <label>${escapeHTML(t)}</label>
          <input type="number" min="0" step="1" class="in-precio" data-tipo="${escapeHTML(t)}" value="${tarifas.precios[t] || 0}" />
        </div>
      `
      ).join("")}
      <div class="field">
        <label>Comisión de la plataforma (%)</label>
        <input type="number" min="0" max="100" step="1" id="in-comision" value="${tarifas.comisionPorcentaje || 0}" />
      </div>
      <div id="tarifas-error" class="error-text" style="display:none;"></div>
      <div id="tarifas-ok" class="muted" style="display:none; font-size:13.5px;">Guardado.</div>
      <button type="submit" class="btn-primary" id="tarifas-submit">Guardar tarifas</button>
    </form>
  `;

  document.getElementById("form-tarifas").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("tarifas-submit");
    const errEl = document.getElementById("tarifas-error");
    const okEl = document.getElementById("tarifas-ok");
    errEl.style.display = "none";
    okEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Guardando…";

    const precios = {};
    el.querySelectorAll(".in-precio").forEach((input) => {
      precios[input.dataset.tipo] = Number(input.value) || 0;
    });
    const comisionPorcentaje = Number(document.getElementById("in-comision").value) || 0;

    try {
      await EnfApp.db.collection("config").doc("tarifas").set(
        { precios, comisionPorcentaje, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      okEl.style.display = "block";
    } catch (err) {
      errEl.textContent = "No se pudo guardar: " + err.message;
      errEl.style.display = "block";
    }
    btn.disabled = false;
    btn.textContent = "Guardar tarifas";
  });
}

/* ===================== Suscripciones ===================== */
function suscribirDatos() {
  unsubEnfermeros = EnfApp.db.collection("enfermeros").onSnapshot((snap) => {
    enfermeros = [];
    snap.forEach((doc) => enfermeros.push({ id: doc.id, ...doc.data() }));
    enfermeros.sort((a, b) => (a.estado === "pendiente" ? -1 : 1) - (b.estado === "pendiente" ? -1 : 1));
    renderTabContent();
  });
  unsubPedidos = EnfApp.db.collection("pedidos").onSnapshot((snap) => {
    pedidos = [];
    snap.forEach((doc) => pedidos.push({ id: doc.id, ...doc.data() }));
    pedidos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderTabContent();
  });
  unsubTarifas = EnfApp.db
    .collection("config")
    .doc("tarifas")
    .onSnapshot((doc) => {
      tarifas = doc.exists ? { precios: {}, comisionPorcentaje: 0, ...doc.data() } : { precios: {}, comisionPorcentaje: 0 };
      renderTabContent();
    });
}

function limpiarSuscripciones() {
  if (unsubEnfermeros) {
    unsubEnfermeros();
    unsubEnfermeros = null;
  }
  if (unsubPedidos) {
    unsubPedidos();
    unsubPedidos = null;
  }
  if (unsubTarifas) {
    unsubTarifas();
    unsubTarifas = null;
  }
}

/* ===================== Init ===================== */
function init() {
  const app = initFirebaseOrShowSetup();
  if (!app) return;

  content.innerHTML = `<div class="muted" style="text-align:center; padding:40px;">Cargando…</div>`;

  app.auth.onAuthStateChanged(async (user) => {
    limpiarSuscripciones();
    if (!user) {
      renderLogin();
      return;
    }
    const adminDoc = await app.db.collection("admins").doc(user.uid).get();
    if (!adminDoc.exists) {
      renderSinPermiso();
      return;
    }
    renderDashboard();
    suscribirDatos();
  });
}

init();
