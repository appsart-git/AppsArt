const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

async function notificarAdmins(title, body, url) {
  const tokensSnap = await admin.firestore().collection("adminTokens").get();
  if (tokensSnap.empty) return;
  const tokens = tokensSnap.docs.map((d) => d.id);

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
  await Promise.all(invalidos.map((t) => admin.firestore().collection("adminTokens").doc(t).delete()));
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
