'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

/* Subtítulos quemados para los reels de producto de Tecno Art: van corriendo con la
   locución (un bloque corto de texto por vez, sincronizado con los timestamps reales de
   ElevenLabs — ver narracion.js), no un cartel fijo con todo el guion. Letra chica, bien
   abajo de la imagen. Cada bloque se renderiza con Playwright (no el filtro drawtext de
   ffmpeg, que es frágil con acentos/signos ¿?/comillas) — mismo criterio que
   carrusel.js/ficha.js: tipografía real, no aproximada.

   Primera versión mostraba el guion completo como una sola placa fija durante los 10s,
   con letra grande y bastante arriba del piso del cuadro — el cliente pidió que corra
   con la voz, con letra chica, bien abajo (y que se saque del todo si no se puede hacer
   bien sincronizado). */

const ANCHO = 720, ALTO = 1280;

function paginaSubtitulo(texto){
  return `<!doctype html><html><head><style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:${ANCHO}px;height:${ALTO}px;overflow:hidden;background:transparent;}
    .lienzo{width:${ANCHO}px;height:${ALTO}px;position:relative;font-family:'Manrope',Arial,sans-serif;}
    .caja{
      position:absolute; left:60px; right:60px; bottom:90px;
      display:flex; align-items:center; justify-content:center;
      text-align:center;
    }
    .texto{
      color:#ffffff; font-weight:700; font-size:29px; line-height:1.3;
      background:rgba(0,0,0,0.5); border-radius:8px; padding:8px 14px;
      text-shadow:0 1px 3px rgba(0,0,0,0.5);
      display:inline-block;
    }
  </style></head><body>
    <div class="lienzo">
      <div class="caja"><div class="texto">${texto}</div></div>
    </div>
  </body></html>`;
}

function escHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Renderiza un bloque de subtítulos por cada elemento de `bloques` ({texto,inicio,fin}),
   reusando un solo browser. Devuelve el mismo array con un `buffer` (PNG con canal alfa)
   agregado a cada bloque, listo para superponerse al video con ffmpeg overlay + enable
   entre inicio/fin. */
async function renderSubtitulos(bloques){
  if(!bloques || bloques.length === 0) return [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnoart-sub-'));
  let browser;
  try{
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO } });
    const salida = [];
    for(let i = 0; i < bloques.length; i++){
      const bloque = bloques[i];
      await page.setContent(paginaSubtitulo(escHtml(bloque.texto)));
      await page.evaluate(() => document.fonts.ready);
      const framePath = path.join(dir, `subtitulo-${i}.png`);
      await page.screenshot({ path: framePath, omitBackground: true });
      salida.push({ ...bloque, buffer: fs.readFileSync(framePath) });
    }
    await browser.close();
    browser = null;
    return salida;
  } finally {
    if(browser) await browser.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { renderSubtitulos };
