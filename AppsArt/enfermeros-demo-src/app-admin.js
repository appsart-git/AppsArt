/* Clave pública VAPID (Firebase Console → Configuración del proyecto → Cloud
   Messaging → "Certificados push web" → generar par de claves). No es secreta,
   pero hasta pegarla acá los avisos push no van a poder activarse. */
const VAPID_KEY = "BNc-010QEq_zR6X9kRULDI6vVy1DnGp3h5jktuCKilePX-4dNrfr2cRKWRNoE2SO4Pt0CbxyHUFWr0ZeXKQD4k4";

const ESTADOS_PEDIDO = ["pendiente", "asignado", "confirmado", "en_curso", "completado", "cancelado"];
const ESTADO_LABELS = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  asignado: "Asignado",
  confirmado: "Confirmado",
  en_curso: "En curso",
  completado: "Completado",
  cancelado: "Cancelado",
};

function badgeHTML(estado) {
  return `<span class="badge badge-${estado}">${ESTADO_LABELS[estado] || estado}</span>`;
}
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function traducirErrorAuth(err) {
  const code = err.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Email o contraseña incorrectos.";
  return err.message;
}

const content = document.getElementById("content");
let unsubEnfermeros = null;
let unsubPedidos = null;
let enfermeros = [];
let pedidos = [];
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
        <p class="muted" style="margin:0 0 18px;">Acceso restringido al equipo de CuidaHoy.</p>
        <form id="form-login">
          <div class="field"><label>Email</label><input type="email" id="li-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="li-password" required /></div>
          <div id="li-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="li-submit">Ingresar</button>
        </form>
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
      </div>
      <div id="tab-content"></div>
      <div class="by-appsart">by AppsArt</div>
    </div>
  `;
  document.getElementById("btn-logout").addEventListener("click", () => EnfApp.auth.signOut());
  renderPushStatus();
  document.getElementById("tab-enfermeros").addEventListener("click", () => {
    tabActual = "enfermeros";
    renderDashboard();
  });
  document.getElementById("tab-pedidos").addEventListener("click", () => {
    tabActual = "pedidos";
    renderDashboard();
  });
  renderTabContent();
}

function renderTabContent() {
  const el = document.getElementById("tab-content");
  if (!el) return;
  if (tabActual === "enfermeros") renderTabEnfermeros(el);
  else renderTabPedidos(el);
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
          <div>
            <div style="font-weight:600;">${escapeHTML(e.nombre)}</div>
            <div class="muted" style="font-size:13.5px;">Matrícula ${escapeHTML(e.matricula)} · ${escapeHTML(e.zona)} · ${escapeHTML(e.telefono)}</div>
          </div>
          ${badgeHTML(e.estado)}
        </div>
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          ${e.matriculaArchivoPath ? `<button class="btn-icon btn-ver-matricula" data-path="${escapeHTML(e.matriculaArchivoPath)}">Ver matrícula</button>` : ""}
          ${e.estado !== "aprobado" ? `<button class="btn-primary btn-aprobar" style="width:auto; padding:8px 12px; font-size:13px;" data-id="${e.id}">Aprobar</button>` : ""}
          ${e.estado !== "rechazado" ? `<button class="btn-danger btn-rechazar" data-id="${e.id}">Rechazar</button>` : ""}
        </div>
      </div>
    `
      )
      .join("")}
  </div>`;

  el.querySelectorAll(".btn-ver-matricula").forEach((btn) => {
    btn.addEventListener("click", async () => {
      // Hay que abrir la pestaña en el mismo instante del click (antes de cualquier
      // await) — si no, el navegador del celular (sobre todo Safari) la bloquea
      // silenciosamente por no considerarlo ya parte del gesto del usuario.
      const nuevaPestania = window.open("", "_blank", "noreferrer");
      btn.textContent = "Abriendo…";
      try {
        const url = await EnfApp.storage.ref(btn.dataset.path).getDownloadURL();
        if (nuevaPestania) nuevaPestania.location.href = url;
        else location.href = url; // por si el navegador igual bloqueó la ventana en blanco
      } catch (err) {
        if (nuevaPestania) nuevaPestania.close();
        alert("No se pudo abrir la matrícula: " + err.message);
      }
      btn.textContent = "Ver matrícula";
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
}

/* ===================== Avisos push ===================== */
function renderPushStatus() {
  const el = document.getElementById("push-status");
  if (!el) return;
  const soportado = "Notification" in window && "serviceWorker" in navigator;
  if (!soportado) {
    el.innerHTML = `<div class="muted" style="font-size:13px;">Este navegador no soporta avisos push.</div>`;
    return;
  }
  if (Notification.permission === "granted") {
    el.innerHTML = `<div class="muted" style="font-size:13px;">🔔 Avisos activados en este dispositivo.</div>`;
    return;
  }
  el.innerHTML = `
    <button class="btn-ghost" id="btn-activar-avisos" style="width:auto; padding:10px 14px; font-size:13.5px;">
      🔔 Activar avisos de enfermero/pedido nuevo
    </button>
    <div id="push-error" class="error-text" style="display:none; margin-top:8px;"></div>
  `;
  document.getElementById("btn-activar-avisos").addEventListener("click", activarAvisosPush);
}

async function activarAvisosPush() {
  const errEl = document.getElementById("push-error");
  if (errEl) errEl.style.display = "none";
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      if (errEl) {
        errEl.textContent = "No se activaron los avisos — tenés que permitirlo en el navegador.";
        errEl.style.display = "block";
      }
      return;
    }
    const registration = await navigator.serviceWorker.register("firebase-messaging-sw.js");
    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    await EnfApp.db.collection("adminTokens").doc(token).set({
      uid: EnfApp.auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    messaging.onMessage((payload) => {
      const { title, body } = payload.notification || {};
      alert((title || "CuidaHoy") + (body ? "\n" + body : ""));
    });
    renderPushStatus();
  } catch (err) {
    if (errEl) {
      errEl.textContent = "No se pudo activar: " + err.message;
      errEl.style.display = "block";
    }
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
