/* ===================== Config Firebase ===================== */
/* Proyecto real de CUIDAR+ (creado por el usuario) — hardcodeado para que cualquier
   dispositivo que abra el link conecte solo, sin pegar nada. El config de Firebase Web
   no es secreto (la seguridad depende de las reglas de Firestore/Storage, no de esto).
   Para clonar este demo a otro proyecto, poner esto en null y va a mostrar la pantalla
   de "pegar tu propio firebaseConfig" en su lugar. */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDzgsiymVEL0nIbTxOnAbLSDkIp8LruMOg",
  authDomain: "cuidahoy-6442d.firebaseapp.com",
  projectId: "cuidahoy-6442d",
  storageBucket: "cuidahoy-6442d.firebasestorage.app",
  messagingSenderId: "332900296525",
  appId: "1:332900296525:web:9f44b591b8d3e9669a7904",
};

/* App Check (protección anti-bots/abuso) — clave del sitio de reCAPTCHA v3, se
   genera en google.com/recaptcha/admin y se registra en Firebase Console → App
   Check (ver README). No es secreta.

   DESACTIVADO (2026-08) — la clave actual no tiene bien registrado el dominio
   real (cuida-hoy.netlify.app) en reCAPTCHA, y mientras eso pase, App Check
   entra en un bucle de "throttled" que bloquea CUALQUIER escritura a Firestore
   — se reprodujo en producción, no solo en localhost, e impedía que un
   paciente/enfermero nuevo pudiera registrarse. Se prioriza que la app
   funcione: las reglas de Firestore/Storage por-usuario ya construidas siguen
   siendo la protección real, App Check es una capa extra opcional. Para
   reactivarlo: confirmar el dominio en google.com/recaptcha/admin para esta
   clave, poner APP_CHECK_ACTIVO en true, y probar un registro real en
   producción (no solo en localhost) antes de confiar en que quedó bien. */
const APP_CHECK_ACTIVO = false;
const RECAPTCHA_SITE_KEY = "6LfhQY0tAAAAANPzWpubAUSjFyBgSM3vDkYG9j--";

const FB_CONFIG_LS_KEY = "enfermerosDemo_firebaseConfig";

function getStoredFirebaseConfig() {
  const raw = localStorage.getItem(FB_CONFIG_LS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveFirebaseConfig(cfg) {
  localStorage.setItem(FB_CONFIG_LS_KEY, JSON.stringify(cfg));
}

/* Firebase muestra el snippet completo (import, comentarios, initializeApp(...)),
   no solo el objeto — así que hay que aislar el literal {...} contando llaves,
   en vez de asumir que todo el texto pegado ya es JSON. */
function extraerObjetoFirebaseConfig(raw) {
  const marcador = raw.indexOf("firebaseConfig");
  const desde = marcador >= 0 ? raw.slice(marcador) : raw;
  const inicio = desde.indexOf("{");
  if (inicio === -1) throw new Error("no se encontró el objeto firebaseConfig");
  let profundidad = 0,
    fin = -1;
  for (let i = inicio; i < desde.length; i++) {
    if (desde[i] === "{") profundidad++;
    if (desde[i] === "}") {
      profundidad--;
      if (profundidad === 0) {
        fin = i;
        break;
      }
    }
  }
  if (fin === -1) throw new Error("el objeto firebaseConfig quedó sin cerrar");
  return desde.slice(inicio, fin + 1);
}

function parseFirebaseConfigSnippet(raw) {
  const objeto = extraerObjetoFirebaseConfig(raw);
  // Solo convierte a comillas las claves que siguen a "{" o "," — así no confunde
  // los ":" que puede tener un valor (ej. el appId trae "1:83...:web:...").
  const jsonish = objeto
    .replace(/([{,]\s*)([A-Za-z0-9_$]+)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*}/g, "}");
  const cfg = JSON.parse(jsonish);
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error("Faltan campos (apiKey / projectId). Revisá que copiaste el objeto completo.");
  }
  return cfg;
}

function renderSetupScreen(onSaved) {
  const root = document.createElement("div");
  root.className = "setup-wrap";
  root.innerHTML = `
    <div class="demo-banner"><strong>MODO DEMO</strong> — versión de prueba de AppsArt, no usar con datos reales.</div>
    <div class="card" style="margin-top:16px;">
      <h2 style="margin-bottom:10px;">Configurar Firebase (una sola vez)</h2>
      <ol class="muted" style="margin:0 0 14px; padding-left:18px; line-height:1.7;">
        <li>Entrá a <b>console.firebase.google.com</b> y creá un proyecto nuevo.</li>
        <li>"Compilación" → "Authentication" → habilitar el proveedor "Correo electrónico/contraseña".</li>
        <li>"Compilación" → "Firestore Database" → crear base de datos (modo producción).</li>
        <li>"Compilación" → "Storage" → comenzar (ahí se guardan las fotos de matrícula).</li>
        <li>Ícono de tuerca → "Configuración del proyecto" → agregar app Web (&lt;/&gt;) → copiá el objeto <code>firebaseConfig</code>.</li>
        <li>Pegalo acá abajo tal cual.</li>
      </ol>
      <textarea id="fb-config-input" placeholder='const firebaseConfig = { apiKey: "...", projectId: "...", ... };'></textarea>
      <div id="fb-config-error" class="error-text" style="display:none; margin-top:10px;"></div>
      <button id="fb-config-save" class="btn-primary" style="margin-top:14px;">Guardar y continuar</button>
    </div>
  `;
  document.body.innerHTML = "";
  document.body.appendChild(root);
  document.getElementById("fb-config-save").addEventListener("click", () => {
    const raw = document.getElementById("fb-config-input").value.trim();
    const errEl = document.getElementById("fb-config-error");
    errEl.style.display = "none";
    try {
      const cfg = parseFirebaseConfigSnippet(raw);
      saveFirebaseConfig(cfg);
      onSaved();
    } catch (e) {
      errEl.textContent =
        "No pude leer ese texto. Pegá el objeto firebaseConfig completo, tal cual lo muestra Firebase.";
      errEl.style.display = "block";
    }
  });
}

/* Llamar al principio de cada página. Devuelve null (y muestra la pantalla de
   configuración) si todavía no hay firebaseConfig guardado; si ya hay, inicializa
   Firebase y devuelve { app, db, auth, storage }. */
function initFirebaseOrShowSetup() {
  const cfg = DEFAULT_FIREBASE_CONFIG || getStoredFirebaseConfig();
  if (!cfg) {
    renderSetupScreen(() => location.reload());
    return null;
  }
  const app = firebase.initializeApp(cfg);
  if (APP_CHECK_ACTIVO && RECAPTCHA_SITE_KEY !== "PENDIENTE_PEGAR_SITE_KEY" && firebase.appCheck) {
    firebase.appCheck().activate(RECAPTCHA_SITE_KEY, true);
  }
  window.EnfApp = {
    app,
    db: firebase.firestore(),
    auth: firebase.auth(),
    storage: firebase.storage(),
  };
  return window.EnfApp;
}

function demoBannerHTML() {
  return `<div class="demo-banner"><strong>MODO DEMO</strong> — versión de prueba de AppsArt, no usar con datos reales.</div>`;
}
