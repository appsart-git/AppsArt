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
          <div class="brand-icon"><img src="img/icon.png" alt="CUIDAR+" /></div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Iniciar sesión</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Para ver y pedir tus turnos de enfermería.</p>
        <form id="form-login">
          <div class="field"><label>Email</label><input type="email" id="li-email" required /></div>
          <div class="field"><label>Contraseña</label><input type="password" id="li-password" required /></div>
          <div id="li-error" class="error-text" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="li-submit">Ingresar</button>
        </form>
        ${forgotPasswordHTML()}
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
  wireOlvideContrasena(EnfApp.auth);
}

function renderRegistro() {
  render(`
    <div class="auth-wrap">
      <div class="card" style="width:100%; max-width:380px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <div class="brand-icon"><img src="img/icon.png" alt="CUIDAR+" /></div>
          <div style="font-family:var(--font-display); font-weight:600; font-size:17px;">Crear cuenta</div>
        </div>
        <p class="muted" style="margin:0 0 18px;">Para pedir un enfermero a domicilio.</p>
        <form id="form-registro">
          <div class="field"><label>Nombre y apellido</label><input id="re-nombre" required /></div>
          <div class="field"><label>Teléfono</label><input id="re-telefono" required /></div>
          ${zonaFieldHTML("re", null)}
          <div class="field"><label>Email</label><input type="email" id="re-email" required /></div>
          <div class="field">
            <label>Contraseña</label>
            <input type="password" id="re-password" minlength="8" pattern="(?=.*[A-Za-z])(?=.*\\d).{8,}" title="Mínimo 8 caracteres, con al menos una letra y un número" required />
            <div class="muted" style="font-size:12px; margin-top:4px;">Mínimo 8 caracteres, con al menos una letra y un número.</div>
          </div>
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
  wireZonaField("re");
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
      cred.user.sendEmailVerification().catch(() => {});
      const paciente = {
        nombre: document.getElementById("re-nombre").value,
        telefono: document.getElementById("re-telefono").value,
        zona: getZonaValue("re"),
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
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div>
          <div class="muted" style="font-size:13px;">Hola,</div>
          <div style="font-family:var(--font-display); font-size:19px; font-weight:600;">${escapeHTML(paciente.nombre)}</div>
        </div>
        <button class="btn-icon" id="btn-logout">Salir</button>
      </div>
      <button class="btn-ghost" id="btn-editar-perfil" style="width:auto; padding:6px 12px; font-size:12.5px; margin-bottom:20px;">✏️ Editar perfil</button>
      <div id="form-perfil-wrap"></div>

      <div id="verificacion-email"></div>
      <div id="push-status" style="margin-bottom:16px;"></div>

      <button class="btn-primary" id="btn-nuevo-pedido" style="margin-bottom:20px;">+ Pedir un enfermero</button>

      <div id="form-pedido-wrap"></div>

      <div style="font-weight:600; margin-bottom:10px; font-size:14px;" class="muted">Tus pedidos</div>
      <div id="lista-pedidos" style="display:flex; flex-direction:column; gap:10px;">
        <div class="muted">Cargando…</div>
      </div>

      <div class="by-appsart">by <img src="img/appsart-brand.png" alt="AppsArt" /></div>
    </div>
  `);

  document.getElementById("btn-logout").addEventListener("click", () => EnfApp.auth.signOut());
  document.getElementById("btn-editar-perfil").addEventListener("click", () => {
    document.getElementById("btn-editar-perfil").style.display = "none";
    renderFormPerfil(paciente);
  });
  renderVerificacionEmail(EnfApp.auth);
  renderPushStatus("pacienteTokens", "Activar avisos de pedido asignado");
  document.getElementById("btn-nuevo-pedido").addEventListener("click", async () => {
    document.getElementById("btn-nuevo-pedido").style.display = "none";
    const tarifasDoc = await EnfApp.db.collection("config").doc("tarifas").get();
    const precios = tarifasDoc.exists ? tarifasDoc.data().precios || {} : {};
    renderFormPedido(paciente, precios);
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

function renderFormPerfil(paciente) {
  const wrap = document.getElementById("form-perfil-wrap");
  wrap.innerHTML = `
    <form id="form-perfil" class="card" style="margin-bottom:20px;">
      <div class="field"><label>Nombre y apellido</label><input id="pf-nombre" value="${escapeHTML(paciente.nombre)}" required /></div>
      <div class="field"><label>Teléfono</label><input id="pf-telefono" value="${escapeHTML(paciente.telefono)}" required /></div>
      ${zonaFieldHTML("pf", paciente.zona)}
      <div id="pf-error" class="error-text" style="display:none;"></div>
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn-ghost" id="pf-cancelar" style="flex:1;">Cancelar</button>
        <button type="submit" class="btn-primary" id="pf-submit" style="flex:1;">Guardar cambios</button>
      </div>
    </form>
  `;
  wireZonaField("pf");
  document.getElementById("pf-cancelar").addEventListener("click", () => {
    wrap.innerHTML = "";
    document.getElementById("btn-editar-perfil").style.display = "block";
  });
  document.getElementById("form-perfil").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("pf-submit");
    const errEl = document.getElementById("pf-error");
    errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      await EnfApp.db.collection("pacientes").doc(EnfApp.auth.currentUser.uid).update({
        nombre: document.getElementById("pf-nombre").value,
        telefono: document.getElementById("pf-telefono").value,
        zona: getZonaValue("pf"),
      });
      const doc = await EnfApp.db.collection("pacientes").doc(EnfApp.auth.currentUser.uid).get();
      renderDashboard(doc.data());
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  });
}

function renderListaPedidos(pedidos) {
  const el = document.getElementById("lista-pedidos");
  if (!el) return;
  if (pedidos.length === 0) {
    el.innerHTML = `<div class="muted">Todavía no hiciste ningún pedido.</div>`;
    return;
  }
  const CANCELABLE = ["pendiente", "asignado"];
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
        <div style="font-size:13.5px; margin-top:4px; font-weight:600;">${p.precio != null ? formatMonto(p.precio) : "A confirmar"}</div>
        ${p.enfermeroId ? `<div id="enfermero-${p.id}"></div>` : ""}
        ${
          CANCELABLE.includes(p.estado)
            ? `<button class="btn-danger btn-cancelar-pedido" data-id="${p.id}" style="margin-top:10px;">Cancelar pedido</button>`
            : ""
        }
        ${p.estado === "completado" ? calificacionSlotHTML(p.id, "paciente") : ""}
      </div>
    `
    )
    .join("");

  el.querySelectorAll(".btn-cancelar-pedido").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Seguro que querés cancelar este pedido?")) return;
      btn.disabled = true;
      btn.textContent = "Cancelando…";
      try {
        await EnfApp.db.collection("pedidos").doc(btn.dataset.id).update({ estado: "cancelado" });
      } catch (err) {
        alert("No se pudo cancelar: " + err.message);
        btn.disabled = false;
        btn.textContent = "Cancelar pedido";
      }
    });
  });

  pedidos
    .filter((p) => p.estado === "completado")
    .forEach((p) => renderCalificacionSlot(EnfApp.db, p.id, "paciente", "al enfermero"));

  pedidos.filter((p) => p.enfermeroId).forEach((p) => renderEnfermeroAsignado(p));
}

async function renderEnfermeroAsignado(pedido) {
  const el = document.getElementById(`enfermero-${pedido.id}`);
  if (!el) return;
  try {
    const doc = await EnfApp.db.collection("enfermeros").doc(pedido.enfermeroId).get();
    if (!doc.exists) return;
    const enfermero = doc.data();

    let fotoHTML = `<div style="width:76px; height:76px; border-radius:12px; background:var(--surface-2); flex-shrink:0;"></div>`;
    if (enfermero.fotoPerfilPath) {
      try {
        const url = await EnfApp.storage.ref(enfermero.fotoPerfilPath).getDownloadURL();
        fotoHTML = `<img src="${url}" alt="" style="width:76px; height:76px; border-radius:12px; object-fit:cover; flex-shrink:0;" />`;
      } catch (err) {
        // sin foto disponible, se queda el placeholder vacío
      }
    }

    const puedeCobrarOnline = enfermero.mpConectado && pedido.pagoEstado === "pendiente" && pedido.precio != null;

    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
        ${fotoHTML}
        <div style="font-size:13.5px;">
          <div class="muted">Tu enfermero:</div>
          <div style="font-weight:600;">${escapeHTML(enfermero.nombre)}</div>
          <div class="muted">Matrícula ${escapeHTML(enfermero.matricula)} · Póliza de seguro ${enfermero.seguroPoliza ? escapeHTML(enfermero.seguroPoliza) : "—"}</div>
        </div>
      </div>
      ${
        puedeCobrarOnline
          ? `<button class="btn-primary btn-pagar-mp" data-id="${pedido.id}" style="margin-top:10px; width:auto; padding:8px 14px; font-size:13.5px;">💳 Pagar con Mercado Pago</button>
             <div id="pagar-mp-error-${pedido.id}" class="error-text" style="display:none; margin-top:6px; font-size:12.5px;"></div>`
          : pedido.pagoEstado === "pendiente"
            ? `<div class="muted" style="font-size:12.5px; margin-top:8px;">💵 Coordiná el pago en efectivo directo con el enfermero.</div>`
            : ""
      }
    `;

    if (puedeCobrarOnline) {
      el.querySelector(".btn-pagar-mp").addEventListener("click", async () => {
        const btn = el.querySelector(".btn-pagar-mp");
        const errEl = document.getElementById(`pagar-mp-error-${pedido.id}`);
        errEl.style.display = "none";
        btn.disabled = true;
        btn.textContent = "Generando link de pago…";
        try {
          const crearPreferencia = EnfApp.functions.httpsCallable("crearPreferenciaMP");
          const { data } = await crearPreferencia({ pedidoId: pedido.id });
          location.href = data.initPoint;
        } catch (err) {
          errEl.textContent = "No se pudo generar el pago: " + (err.message || err);
          errEl.style.display = "block";
          btn.disabled = false;
          btn.textContent = "💳 Pagar con Mercado Pago";
        }
      });
    }
  } catch (err) {
    // sin acceso al doc del enfermero (por ej. reglas todavía no actualizadas): no
    // mostramos nada, no rompe el resto de la tarjeta.
  }
}

function renderFormPedido(paciente, precios) {
  const wrap = document.getElementById("form-pedido-wrap");
  const nombresServicio = Object.keys(precios || {});
  wrap.innerHTML = `
    <form id="form-pedido" class="card" style="margin-bottom:20px;">
      <div class="field"><label>Tipo de servicio</label>
        <select id="pe-tipo">
          ${nombresServicio.map((t) => `<option value="${t}">${t}</option>`).join("")}
          <option value="${SERVICIO_OTRO}">${SERVICIO_OTRO}</option>
        </select>
        <div id="pe-precio-preview" class="muted" style="font-size:13px; margin-top:6px;"></div>
        <input id="pe-tipo-otro" placeholder="¿Qué servicio necesitás?" style="margin-top:8px; display:none;" />
      </div>
      ${zonaFieldHTML("pe", paciente.zona)}
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
  wireZonaField("pe");

  const selTipo = document.getElementById("pe-tipo");
  const preview = document.getElementById("pe-precio-preview");
  const inputOtro = document.getElementById("pe-tipo-otro");
  function actualizarPreview() {
    const esOtro = selTipo.value === SERVICIO_OTRO;
    inputOtro.style.display = esOtro ? "block" : "none";
    inputOtro.required = esOtro;
    preview.textContent = esOtro ? "Precio: a confirmar con el equipo de CUIDAR+." : "Precio: " + formatMonto(precios[selTipo.value]);
  }
  selTipo.addEventListener("change", actualizarPreview);
  actualizarPreview();

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
      const esOtro = selTipo.value === SERVICIO_OTRO;
      const tipoServicio = esOtro ? inputOtro.value.trim() : selTipo.value;
      const precio = esOtro ? null : precios[selTipo.value] != null ? precios[selTipo.value] : null;

      await EnfApp.db.collection("pedidos").add({
        pacienteId: EnfApp.auth.currentUser.uid,
        pacienteNombre: paciente.nombre,
        pacienteTelefono: paciente.telefono,
        enfermeroId: null,
        tipoServicio,
        precio,
        zona: getZonaValue("pe"),
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
