const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const MP_CLIENT_ID = defineSecret("MP_CLIENT_ID");
const MP_CLIENT_SECRET = defineSecret("MP_CLIENT_SECRET");

// No son secretos, pero conviene tenerlos en un solo lugar por si cambia el dominio de
// Netlify o la región de las Cloud Functions (hoy la región por default es us-central1).
const APP_BASE_URL = "https://cuidar-mas.netlify.app";
const FUNCTIONS_BASE_URL = "https://us-central1-cuidahoy-6442d.cloudfunctions.net";

/* ===================== 1) Conectar cuenta de Mercado Pago (OAuth) =====================
   El enfermero aprieta "Conectar Mercado Pago" en su panel → el cliente crea un doc en
   mpOauthState/{token} con su propio uid (la regla de Firestore exige que coincida con
   quien está logueado) → lo mandamos a la pantalla de autorización de MP con ese token
   como "state" → MP redirige acá con ?code&state → intercambiamos el code por un
   access_token/refresh_token de la cuenta de MP del enfermero y lo guardamos.

   NO PROBADO TODAVÍA CONTRA MERCADO PAGO REAL — arrancado con credenciales de test
   pendientes (ver README, sección Mercado Pago). Revisar contra la documentación de
   MP antes de confiar en esto en producción. */
exports.mpOauthCallback = onRequest({ secrets: [MP_CLIENT_ID, MP_CLIENT_SECRET] }, async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    res.redirect(`${APP_BASE_URL}/enfermero.html?mp=error`);
    return;
  }
  if (!code || !state) {
    res.status(400).send("Faltan parámetros de Mercado Pago (code/state).");
    return;
  }

  const db = admin.firestore();
  const estadoRef = db.collection("mpOauthState").doc(String(state));
  try {
    const estadoDoc = await estadoRef.get();
    if (!estadoDoc.exists) {
      res.redirect(`${APP_BASE_URL}/enfermero.html?mp=error`);
      return;
    }
    const { uid } = estadoDoc.data();
    await estadoRef.delete(); // token de un solo uso

    const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID.value(),
        client_secret: MP_CLIENT_SECRET.value(),
        grant_type: "authorization_code",
        code,
        redirect_uri: `${FUNCTIONS_BASE_URL}/mpOauthCallback`,
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      throw new Error(tokenData.message || "Mercado Pago no devolvió un token válido.");
    }

    await db.collection("enfermerosMPTokens").doc(uid).set({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      mpUserId: tokenData.user_id,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("enfermeros").doc(uid).update({
      mpConectado: true,
      mpUserId: tokenData.user_id,
    });

    res.redirect(`${APP_BASE_URL}/enfermero.html?mp=ok`);
  } catch (err) {
    console.error("Error en mpOauthCallback:", err);
    res.redirect(`${APP_BASE_URL}/enfermero.html?mp=error`);
  }
});

/* ===================== 2) Crear preferencia de pago (Checkout Pro) =====================
   El paciente aprieta "Pagar con Mercado Pago" en un pedido ya asignado (recién ahí se
   sabe a qué enfermero — y a qué cuenta de MP — hay que cobrarle). Genera el link de
   pago usando la cuenta del ENFERMERO como cobrador y descuenta la comisión de la
   plataforma vía marketplace_fee — Mercado Pago reparte la plata solo, no hace falta
   ninguna transferencia manual después. */
exports.crearPreferenciaMP = onCall({ secrets: [MP_CLIENT_ID, MP_CLIENT_SECRET] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Iniciá sesión primero.");
  const { pedidoId } = request.data || {};
  if (!pedidoId) throw new HttpsError("invalid-argument", "Falta pedidoId.");

  const db = admin.firestore();
  const pedidoDoc = await db.collection("pedidos").doc(pedidoId).get();
  if (!pedidoDoc.exists) throw new HttpsError("not-found", "Ese pedido no existe.");
  const pedido = pedidoDoc.data();

  if (pedido.pacienteId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Este pedido no es tuyo.");
  }
  if (!pedido.enfermeroId) {
    throw new HttpsError("failed-precondition", "Todavía no te asignaron un enfermero.");
  }
  if (pedido.precio == null) {
    throw new HttpsError("failed-precondition", "Este pedido todavía no tiene precio confirmado.");
  }

  const tokenDoc = await db.collection("enfermerosMPTokens").doc(pedido.enfermeroId).get();
  if (!tokenDoc.exists) {
    throw new HttpsError("failed-precondition", "Este enfermero todavía no conectó Mercado Pago.");
  }
  const { accessToken } = tokenDoc.data();

  const tarifasDoc = await db.collection("config").doc("tarifas").get();
  const comisionPorcentaje = tarifasDoc.exists ? tarifasDoc.data().comisionPorcentaje || 0 : 0;
  const comision = Math.round((pedido.precio * comisionPorcentaje) / 100);

  const prefResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      items: [
        {
          title: `CUIDAR+ — ${pedido.tipoServicio}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: pedido.precio,
        },
      ],
      marketplace_fee: comision,
      external_reference: pedidoId,
      back_urls: {
        success: `${APP_BASE_URL}/paciente.html?pago=ok`,
        pending: `${APP_BASE_URL}/paciente.html?pago=pendiente`,
        failure: `${APP_BASE_URL}/paciente.html?pago=error`,
      },
      auto_return: "approved",
      notification_url: `${FUNCTIONS_BASE_URL}/mpWebhook`,
    }),
  });
  const pref = await prefResp.json();
  if (!prefResp.ok || !pref.init_point) {
    console.error("Error creando preferencia MP:", pref);
    throw new HttpsError("internal", "No se pudo generar el link de pago.");
  }

  return { initPoint: pref.init_point, sandboxInitPoint: pref.sandbox_init_point || null };
});

/* ===================== 3) Webhook de pago =====================
   Mercado Pago llama acá cuando cambia el estado de un pago. Todavía no sabemos a qué
   enfermero pertenece (el aviso solo trae el ID del pago), así que primero pedimos un
   token de aplicación (client_credentials) para poder consultarlo, y de ahí sacamos el
   external_reference (nuestro pedidoId) para saber qué pedido actualizar. */
exports.mpWebhook = onRequest({ secrets: [MP_CLIENT_ID, MP_CLIENT_SECRET] }, async (req, res) => {
  try {
    const paymentId = req.query["data.id"] || req.query.id || (req.body && req.body.data && req.body.data.id);
    const topic = req.query.type || req.query.topic || (req.body && req.body.type);
    if (topic !== "payment" || !paymentId) {
      res.status(200).send("ignorado");
      return;
    }

    const authResp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID.value(),
        client_secret: MP_CLIENT_SECRET.value(),
        grant_type: "client_credentials",
      }),
    });
    const authData = await authResp.json();
    if (!authResp.ok || !authData.access_token) throw new Error("No se pudo autenticar contra Mercado Pago.");

    const pagoResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${authData.access_token}` },
    });
    const pago = await pagoResp.json();
    if (!pagoResp.ok) throw new Error("No se pudo consultar el pago en Mercado Pago.");

    const pedidoId = pago.external_reference;
    if (pedidoId && pago.status === "approved") {
      await admin.firestore().collection("pedidos").doc(pedidoId).update({
        pagoEstado: "pagado",
        metodoPago: "mercadopago",
        mpPaymentId: String(paymentId),
      });
    }

    res.status(200).send("ok");
  } catch (err) {
    console.error("Error en mpWebhook:", err);
    res.status(200).send("error interno"); // 200 igual, para que MP no reintente en loop
  }
});
