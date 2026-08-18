const content = document.getElementById("content");
let unsubPedidos = null;
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
          <div class="brand-icon">♥</div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Iniciar sesión</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Para ver y pedir tus turnos de enfermería.</p>
        <form id="form-login">
          <div class="field"><label>Email</label><input type="email" id="li-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="li-password" required /></div>
          <div id="li-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="li-submit">Ingresar</button>
        </form>
        <p class="muted" style="text-align:center; margin-top:16px; font-size:13.5px;">
          ¿No tenés cuenta? <a href="paciente.html?vista=registro" style="color:var(--teal-dark); font-weight:600;">Crear cuenta</a>
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
          <div class="brand-icon">♥</div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Crear cuenta</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Para pedir un enfermero a domicilio.</p>
        <form id="form-registro">
          <div class="field"><label>Nombre y apellido</label><input id="re-nombre" required /></div>
          <div class="field"><label>Teléfono</label><input id="re-telefono" required /></div>
          <div class="field"><label>Zona</label>
            <select id="re-zona">${ZONAS.map((z) => `<option value="${z}">${z}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Email</label><input type="email" id="re-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="re-password" minlength="6" required /></div>
          <div id="re-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="re-submit">Crear cuenta</button>
        </form>
        <p class="muted" style="text-align:center; margin-top:16px; font-size:13.5px;">
          ¿Ya tenés cuenta? <a href="paciente.html?vista=login" style="color:var(--teal-dark); font-weight:600;">Iniciar sesión</a>
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
    btn.disabled = true;
    btn.textContent = "Creando cuenta…";
    registrando = true;
    try {
      const cred = await EnfApp.auth.createUserWithEmailAndPassword(
        document.getElementById("re-email").value,
        document.getElementById("re-password").value
      );
      const paciente = {
        nombre: document.getElementById("re-nombre").value,
        telefono: document.getElementById("re-telefono").value,
        zona: document.getElementById("re-zona").value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await EnfApp.db.collection("pacientes").doc(cred.user.uid).set(paciente);
      registrando = false;
      renderDashboard(paciente);
    } catch (err) {
      registrando = false;
      errEl.textContent = traducirErrorAuth(err);
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Crear cuenta";
    }
  });
}

function renderDashboard(paciente) {
  render(`
    <div class="container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <div class="muted" style="font-size:13px;">Hola,</div>
          <div style="font-family:var(--font-display); font-size:19px; font-weight:600;">${escapeHTML(paciente.nombre)}</div>
        </div>
        <button class="btn-icon" id="btn-logout">Salir</button>
      </div>

      <button class="btn-primary" id="btn-nuevo-pedido" style="margin-bottom:20px;">+ Pedir un enfermero</button>

      <div id="form-pedido-wrap"></div>

      <div style="font-weight:600; margin-bottom:10px; font-size:14px;" class="muted">Tus pedidos</div>
      <div id="lista-pedidos" style="display:flex; flex-direction:column; gap:10px;">
        <div class="muted">Cargando…</div>
      </div>

      <div class="by-appsart">by AppsArt</div>
    </div>
  `);

  document.getElementById("btn-logout").addEventListener("click", () => EnfApp.auth.signOut());
  document.getElementById("btn-nuevo-pedido").addEventListener("click", () => {
    document.getElementById("btn-nuevo-pedido").style.display = "none";
    renderFormPedido(paciente);
  });

  const uid = EnfApp.auth.currentUser.uid;
  if (unsubPedidos) unsubPedidos();
  unsubPedidos = EnfApp.db
    .collection("pedidos")
    .where("pacienteId", "==", uid)
    .onSnapshot(
      (snap) => {
        const pedidos = [];
        snap.forEach((doc) => pedidos.push({ id: doc.id, ...doc.data() }));
        pedidos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderListaPedidos(pedidos);
      },
      (err) => {
        document.getElementById("lista-pedidos").innerHTML = `<div class="error-text">Error cargando pedidos: ${escapeHTML(err.message)}</div>`;
      }
    );
}

function renderListaPedidos(pedidos) {
  const el = document.getElementById("lista-pedidos");
  if (!el) return;
  if (pedidos.length === 0) {
    el.innerHTML = `<div class="muted">Todavía no hiciste ningún pedido.</div>`;
    return;
  }
  el.innerHTML = pedidos
    .map(
      (p) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="font-weight:600;">${escapeHTML(p.tipoServicio)}</div>
          ${badgeHTML(p.estado)}
        </div>
        <div class="muted" style="font-size:13.5px; margin-top:6px;">${escapeHTML(p.zona)} · ${escapeHTML(p.fecha)} · ${escapeHTML(p.horario)}</div>
        ${p.direccion ? `<div class="muted" style="font-size:13.5px; margin-top:4px;">📍 ${escapeHTML(p.direccion)}</div>` : ""}
      </div>
    `
    )
    .join("");
}

function renderFormPedido(paciente) {
  const wrap = document.getElementById("form-pedido-wrap");
  wrap.innerHTML = `
    <form id="form-pedido" class="card" style="margin-bottom:20px;">
      <div class="field"><label>Tipo de servicio</label>
        <select id="pe-tipo">${TIPOS_SERVICIO.map((t) => `<option value="${t}">${t}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Zona</label>
        <select id="pe-zona">${ZONAS.map((z) => `<option value="${z}" ${z === paciente.zona ? "selected" : ""}>${z}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Dirección (calle, altura, piso/depto)</label><input id="pe-direccion" placeholder="Ej: Av. Rivadavia 1234, 3° B" required /></div>
      <div class="field"><label>Fecha</label><input type="date" id="pe-fecha" required /></div>
      <div class="field"><label>Horario</label><input id="pe-horario" placeholder="Ej: 14:00 a 16:00" required /></div>
      <div class="field"><label>Notas (opcional)</label><textarea id="pe-notas" rows="3"></textarea></div>
      <div id="pe-error" class="error-text" style="display:none;"></div>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn-ghost" id="pe-cancelar" style="flex:1;">Cancelar</button>
        <button type="submit" class="btn-primary" id="pe-submit" style="flex:1;">Confirmar pedido</button>
      </div>
    </form>
  `;
  document.getElementById("pe-cancelar").addEventListener("click", () => {
    wrap.innerHTML = "";
    document.getElementById("btn-nuevo-pedido").style.display = "block";
  });
  document.getElementById("form-pedido").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("pe-submit");
    const errEl = document.getElementById("pe-error");
    errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Enviando…";
    try {
      await EnfApp.db.collection("pedidos").add({
        pacienteId: EnfApp.auth.currentUser.uid,
        pacienteNombre: paciente.nombre,
        pacienteTelefono: paciente.telefono,
        enfermeroId: null,
        tipoServicio: document.getElementById("pe-tipo").value,
        zona: document.getElementById("pe-zona").value,
        direccion: document.getElementById("pe-direccion").value,
        fecha: document.getElementById("pe-fecha").value,
        horario: document.getElementById("pe-horario").value,
        notas: document.getElementById("pe-notas").value,
        estado: "pendiente",
        pagoEstado: "pendiente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      wrap.innerHTML = "";
      document.getElementById("btn-nuevo-pedido").style.display = "block";
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Confirmar pedido";
    }
  });
}

/* ===================== Init ===================== */
function init() {
  const app = initFirebaseOrShowSetup();
  if (!app) return;

  content.innerHTML = `<div class="muted" style="text-align:center; padding:40px;">Cargando…</div>`;

  app.auth.onAuthStateChanged(async (user) => {
    if (registrando) return; // el propio flujo de registro ya se ocupa de renderizar
    if (!user) {
      if (unsubPedidos) {
        unsubPedidos();
        unsubPedidos = null;
      }
      if (qsVista() === "registro") renderRegistro();
      else renderLogin();
      return;
    }
    const doc = await app.db.collection("pacientes").doc(user.uid).get();
    if (!doc.exists) {
      // Esta cuenta no es de un paciente (por ej. es un enfermero) — cerramos sesión.
      await app.auth.signOut();
      return;
    }
    renderDashboard(doc.data());
  });
}

init();
