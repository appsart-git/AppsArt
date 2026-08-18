/* Código compartido entre paciente.html, enfermero.html y admin.html — evita tener
   la misma lista de zonas, los mismos labels de estado, etc. copiados y pegados en
   los tres archivos (con el riesgo de que alguno quede desactualizado). */

/* ===================== Datos del dominio ===================== */
const ZONAS = ["CABA Norte", "CABA Sur", "CABA Centro", "GBA Norte", "GBA Oeste", "GBA Sur"];
const TIPOS_SERVICIO = ["Curación", "Inyección / medicación", "Control de signos vitales", "Cuidado post-operatorio", "Otro"];
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

/* Clave pública VAPID (Firebase Console → Configuración del proyecto → Cloud
   Messaging → "Certificados push web"). No es secreta — misma clave para los tres
   portales, cada uno guarda su token en su propia colección (adminTokens /
   enfermeroTokens). */
const VAPID_KEY = "BNc-010QEq_zR6X9kRULDI6vVy1DnGp3h5jktuCKilePX-4dNrfr2cRKWRNoE2SO4Pt0CbxyHUFWr0ZeXKQD4k4";

/* ===================== UI helpers ===================== */
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
  if (code.includes("email-already-in-use")) return "Ese email ya tiene una cuenta creada.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Email o contraseña incorrectos.";
  if (code.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("invalid-email")) return "El email no es válido.";
  return err.message;
}

/* ===================== Avisos push (compartido por enfermero y admin) =====================
   Cada portal llama renderPushStatus(tokensCollection, buttonLabel) con su propia
   colección de tokens ("adminTokens" o "enfermeroTokens") y el texto de su botón —
   la lógica de pedir permiso, registrar el service worker y guardar el token es
   idéntica en los dos casos. */
function renderPushStatus(tokensCollection, buttonLabel) {
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
      🔔 ${buttonLabel}
    </button>
    <div id="push-error" class="error-text" style="display:none; margin-top:8px;"></div>
  `;
  document
    .getElementById("btn-activar-avisos")
    .addEventListener("click", () => activarAvisosPush(tokensCollection, buttonLabel));
}

async function activarAvisosPush(tokensCollection, buttonLabel) {
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
    await EnfApp.db.collection(tokensCollection).doc(token).set({
      uid: EnfApp.auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    messaging.onMessage((payload) => {
      const { title, body } = payload.notification || {};
      alert((title || "CuidaHoy") + (body ? "\n" + body : ""));
    });
    renderPushStatus(tokensCollection, buttonLabel);
  } catch (err) {
    if (errEl) {
      errEl.textContent = "No se pudo activar: " + err.message;
      errEl.style.display = "block";
    }
  }
}
