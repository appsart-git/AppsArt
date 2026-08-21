const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const { mpOauthCallback, crearPreferenciaMP, mpWebhook } = require("./mercadopago");
exports.mpOauthCallback = mpOauthCallback;
exports.crearPreferenciaMP = crearPreferenciaMP;
exports.mpWebhook = mpWebhook;

// tokensCollection: "adminTokens" (todos los admins) o "enfermeroTokens" (filtrado por uid)
async function notificarTokens(tokensCollection, tokenDocs, title, body, url) {
  if (tokenDocs.empty) return;
  const tokens = tokenDocs.docs.map((d) => d.id);

  const response = await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data: { url },
    tokens,
  });

  // Un token deja de ser válido si el usuario desinstaló la PWA o borró los datos
  // del sitio — limpiarlos evita mandar pushes al aire indefinidamente.
  const invalidos = [];
  response.responses.forEach((r, i) => {
    if (!r.success && r.error && r.error.code === "messaging/registration-token-not-registered") {
      invalidos.push(tokens[i]);
    }
  });
  await Promise.all(invalidos.map((t) => admin.firestore().collection(tokensCollection).doc(t).delete()));
}

async function notificarAdmins(title, body, url) {
  const tokensSnap = await admin.firestore().collection("adminTokens").get();
  await notificarTokens("adminTokens", tokensSnap, title, body, url);
}

async function notificarEnfermero(enfermeroId, title, body, url) {
  const tokensSnap = await admin
    .firestore()
    .collection("enfermeroTokens")
    .where("uid", "==", enfermeroId)
    .get();
  await notificarTokens("enfermeroTokens", tokensSnap, title, body, url);
}

async function notificarPaciente(pacienteId, title, body, url) {
  const tokensSnap = await admin
    .firestore()
    .collection("pacienteTokens")
    .where("uid", "==", pacienteId)
    .get();
  await notificarTokens("pacienteTokens", tokensSnap, title, body, url);
}

exports.onEnfermeroCreado = onDocumentCreated("enfermeros/{id}", async (event) => {
  const data = event.data.data();
  await notificarAdmins(
    "Nuevo enfermero registrado",
    `${data.nombre || "Un enfermero"} se registró y está pendiente de aprobación.`,
    "/admin.html"
  );
});

exports.onPedidoCreado = onDocumentCreated("pedidos/{id}", async (event) => {
  const data = event.data.data();
  await notificarAdmins(
    "Nuevo pedido",
    `${data.pacienteNombre || "Un paciente"} pidió ${data.tipoServicio || "un servicio"}.`,
    "/admin.html"
  );
});

exports.onPedidoAsignado = onDocumentUpdated("pedidos/{id}", async (event) => {
  const antes = event.data.before.data();
  const despues = event.data.after.data();
  // Solo avisar cuando enfermeroId pasa de vacío/otro valor a uno nuevo — no en cada
  // edición del pedido (cambiar el estado o el pago no debe volver a disparar el aviso).
  if (!despues.enfermeroId || despues.enfermeroId === antes.enfermeroId) return;

  await Promise.all([
    notificarEnfermero(
      despues.enfermeroId,
      "Te asignaron un pedido",
      `${despues.tipoServicio || "Servicio"} — ${despues.zona || ""} · ${despues.fecha || ""} ${despues.horario || ""}`.trim(),
      "/enfermero.html"
    ),
    notificarPaciente(
      despues.pacienteId,
      "Te asignaron un enfermero",
      `Para tu pedido de ${despues.tipoServicio || "servicio"} del ${despues.fecha || ""} ${despues.horario || ""}.`.trim(),
      "/paciente.html"
    ),
  ]);
});
