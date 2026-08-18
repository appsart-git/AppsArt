const content = document.getElementById("content");
let unsubTurnos = null;
let registrando = false;

function qsVista() {
  const params = new URLSearchParams(location.search);
  return params.get("vista") || "login";
}

function render(html) {
  content.innerHTML = html;
}

/* ===================== Pantallas ===================== */
function renderLogin() {
  render(`
    <div class="auth-wrap">
      <div class="card" style="width:100%; max-width:380px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <div class="brand-icon">⚕</div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Iniciar sesión</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Panel de enfermero.</p>
        <form id="form-login">
          <div class="field"><label>Email</label><input type="email" id="li-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="li-password" required /></div>
          <div id="li-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="li-submit">Ingresar</button>
        </form>
        <p class="muted" style="text-align:center; margin-top:16px; font-size:13.5px;">
          ¿No tenés cuenta? <a href="enfermero.html?vista=registro" style="color:var(--teal-dark); font-weight:600;">Sumarme como enfermero</a>
        </p>
        <p class="muted" style="text-align:center; margin-top:6px; font-size:13.5px;">
          <a href="index.html" style="color:var(--teal-dark); font-weight:600;">← Volver al inicio</a>
        </p>
      </div>
    </div>
  `);
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

function renderRegistro() {
  render(`
    <div class="auth-wrap">
      <div class="card" style="width:100%; max-width:380px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <div class="brand-icon">⚕</div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Sumate como enfermero</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Revisamos tu matrícula antes de activarte en la plataforma.</p>
        <form id="form-registro">
          <div class="field"><label>Nombre y apellido</label><input id="re-nombre" required /></div>
          <div class="field"><label>Teléfono</label><input id="re-telefono" required /></div>
          <div class="field"><label>Zona</label>
            <select id="re-zona">${ZONAS.map((z) => `<option value="${z}">${z}</option>`).join("")}</select>
          </div>
          <div class="field"><label>N° de matrícula</label><input id="re-matricula" required /></div>
          <div class="field"><label>Foto o PDF de la matrícula</label>
            <input type="file" id="re-archivo" accept="image/*,application/pdf" required />
          </div>
          <div class="field"><label>Email</label><input type="email" id="re-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="re-password" minlength="6" required /></div>
          <div id="re-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="re-submit">Enviar registro</button>
        </form>
        <p class="muted" style="text-align:center; margin-top:16px; font-size:13.5px;">
          ¿Ya tenés cuenta? <a href="enfermero.html?vista=login" style="color:var(--teal-dark); font-weight:600;">Iniciar sesión</a>
        </p>
        <p class="muted" style="text-align:center; margin-top:6px; font-size:13.5px;">
          <a href="index.html" style="color:var(--teal-dark); font-weight:600;">← Volver al inicio</a>
        </p>
      </div>
    </div>
  `);
  document.getElementById("form-registro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("re-submit");
    const errEl = document.getElementById("re-error");
    errEl.style.display = "none";

    const archivo = document.getElementById("re-archivo").files[0];
    if (!archivo) {
      errEl.textContent = "Subí una foto o PDF de tu matrícula.";
      errEl.style.display = "block";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Enviando…";
    registrando = true;
    try {
      const cred = await EnfApp.auth.createUserWithEmailAndPassword(
        document.getElementById("re-email").value,
        document.getElementById("re-password").value
      );
      const uid = cred.user.uid;
      const ext = archivo.name.split(".").pop();
      const path = `matriculas/${uid}/matricula.${ext}`;
      await EnfApp.storage.ref(path).put(archivo);

      const enfermero = {
        nombre: document.getElementById("re-nombre").value,
        telefono: document.getElementById("re-telefono").value,
        zona: document.getElementById("re-zona").value,
        matricula: document.getElementById("re-matricula").value,
        matriculaArchivoPath: path,
        estado: "pendiente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await EnfApp.db.collection("enfermeros").doc(uid).set(enfermero);
      registrando = false;
      renderDashboard(enfermero);
    } catch (err) {
      registrando = false;
      errEl.textContent = traducirErrorAuth(err);
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Enviar registro";
    }
  });
}

function renderDashboard(enfermero) {
  render(`
    <div class="container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <div class="muted" style="font-size:13px;">Hola,</div>
          <div style="font-family:var(--font-display); font-size:19px; font-weight:600;">${escapeHTML(enfermero.nombre)}</div>
        </div>
        <button class="btn-icon" id="btn-logout">Salir</button>
      </div>

      ${
        enfermero.estado !== "aprobado"
          ? `
        <div class="card" style="display:flex; gap:12px; align-items:flex-start; margin-bottom:20px;">
          <div style="font-size:20px;">⏳</div>
          <div>
            <div style="font-weight:600; margin-bottom:4px;">${badgeHTML(enfermero.estado)}</div>
            <div class="muted" style="font-size:13.5px;">
              ${
                enfermero.estado === "pendiente"
                  ? "Estamos revisando tu matrícula. Te avisamos cuando quedes activo."
                  : "Tu matrícula no fue aprobada. Contactanos para más info."
              }
            </div>
          </div>
        </div>`
          : `
        <div id="push-status" style="margin-bottom:16px;"></div>
        <div style="font-weight:600; margin-bottom:10px; font-size:14px;" class="muted">Tus turnos asignados</div>
        <div id="lista-turnos" style="display:flex; flex-direction:column; gap:10px;">
          <div class="muted">Cargando…</div>
        </div>`
      }

      <div class="by-appsart">by AppsArt</div>
    </div>
  `);

  document.getElementById("btn-logout").addEventListener("click", () => EnfApp.auth.signOut());

  if (enfermero.estado === "aprobado") {
    renderPushStatus("enfermeroTokens", "Activar avisos de pedido asignado");
    const uid = EnfApp.auth.currentUser.uid;
    if (unsubTurnos) unsubTurnos();
    unsubTurnos = EnfApp.db
      .collection("pedidos")
      .where("enfermeroId", "==", uid)
      .onSnapshot(
        (snap) => {
          const turnos = [];
          snap.forEach((doc) => turnos.push({ id: doc.id, ...doc.data() }));
          turnos.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
          renderListaTurnos(turnos);
        },
        (err) => {
          const el = document.getElementById("lista-turnos");
          if (el) el.innerHTML = `<div class="error-text">Error cargando turnos: ${escapeHTML(err.message)}</div>`;
        }
      );
  }
}

function renderListaTurnos(turnos) {
  const el = document.getElementById("lista-turnos");
  if (!el) return;
  if (turnos.length === 0) {
    el.innerHTML = `<div class="muted">Todavía no tenés turnos asignados.</div>`;
    return;
  }
  el.innerHTML = turnos
    .map(
      (p) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="font-weight:600;">${escapeHTML(p.tipoServicio)}</div>
          ${badgeHTML(p.estado)}
        </div>
        <div class="muted" style="font-size:13.5px; margin-top:6px;">${escapeHTML(p.zona)} · ${escapeHTML(p.fecha)} · ${escapeHTML(p.horario)}</div>
        ${p.direccion ? `<div style="font-size:13.5px; margin-top:4px; font-weight:600;">📍 ${escapeHTML(p.direccion)}</div>` : ""}
        ${p.notas ? `<div class="muted" style="font-size:13.5px; margin-top:6px;">${escapeHTML(p.notas)}</div>` : ""}
      </div>
    `
    )
    .join("");
}

/* ===================== Init ===================== */
function init() {
  const app = initFirebaseOrShowSetup();
  if (!app) return;

  content.innerHTML = `<div class="muted" style="text-align:center; padding:40px;">Cargando…</div>`;

  app.auth.onAuthStateChanged(async (user) => {
    if (registrando) return; // el propio flujo de registro ya se ocupa de renderizar
    if (!user) {
      if (unsubTurnos) {
        unsubTurnos();
        unsubTurnos = null;
      }
      if (qsVista() === "registro") renderRegistro();
      else renderLogin();
      return;
    }
    const doc = await app.db.collection("enfermeros").doc(user.uid).get();
    if (!doc.exists) {
      await app.auth.signOut();
      return;
    }
    renderDashboard(doc.data());
  });
}

init();
