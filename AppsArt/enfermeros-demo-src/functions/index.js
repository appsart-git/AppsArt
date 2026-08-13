const functions = require("firebase-functions");
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

exports.onEnfermeroCreado = functions.firestore
  .document("enfermeros/{id}")
  .onCreate(async (snap) => {
    const data = snap.data();
    await notificarAdmins(
      "Nuevo enfermero registrado",
      `${data.nombre || "Un enfermero"} se registró y está pendiente de aprobación.`,
      "/admin.html"
    );
  });

exports.onPedidoCreado = functions.firestore
  .document("pedidos/{id}")
  .onCreate(async (snap) => {
    const data = snap.data();
    await notificarAdmins(
      "Nuevo pedido",
      `${data.pacienteNombre || "Un paciente"} pidió ${data.tipoServicio || "un servicio"}.`,
      "/admin.html"
    );
  });
