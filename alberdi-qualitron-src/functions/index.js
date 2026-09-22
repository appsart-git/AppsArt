const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-5";
const MAX_TOKENS_CAP = 1500; // tope duro del lado del servidor, independiente de lo que pida el cliente

/* Proxy de la API de Claude para la pestaña "Manuales" de Qualitron. La clave de
   Anthropic vive solo acá (Secret Manager de Firebase), nunca en el navegador —
   la app le manda el prompt ya armado (system + fragmentos del manual + pregunta)
   y esta funcion hace la llamada real a api.anthropic.com. */
exports.qualitronManualesAsk = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const { system, messages } = req.body || {};
    if (!system || !Array.isArray(messages) || !messages.length) {
      res.status(400).json({ error: "Faltan 'system' o 'messages' en el body" });
      return;
    }
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS_CAP, system, messages }),
      });
      const data = await resp.json();
      res.status(resp.status).json(data);
    } catch (err) {
      console.error("Error en qualitronManualesAsk:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
