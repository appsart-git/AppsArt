'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

/* Subtítulo quemado para los reels de producto de Tecno Art: el guion completo (ya es
   corto, 6-8s / 15-22 palabras) como una sola placa de texto real renderizada con
   Playwright (no el filtro drawtext de ffmpeg, que es frágil con acentos/signos ¿?/
   comillas) — mismo criterio que carrusel.js/ficha.js: tipografía real, no aproximada.
   Se ubica en el tercio inferior pero por encima de donde Instagram superpone su propia
   interfaz (like/comentar/caption) al reproducir un reel, para que no quede tapado ni
   tape demasiado la imagen del producto. */

const ANCHO = 720, ALTO = 1280;

function paginaSubtitulo(texto){
  return `<!doctype html><html><head><style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:${ANCHO}px;height:${ALTO}px;overflow:hidden;background:transparent;}
    .lienzo{width:${ANCHO}px;height:${ALTO}px;position:relative;font-family:'Manrope',Arial,sans-serif;}
    .caja{
      position:absolute; left:36px; right:36px; bottom:300px;
      background:rgba(0,0,0,0.55); border-radius:16px;
      padding:20px 24px;
      display:flex; align-items:center; justify-content:center;
      text-align:center;
    }
    .texto{
      color:#ffffff; font-weight:800; font-size:33px; line-height:1.35;
      text-shadow:0 1px 4px rgba(0,0,0,0.4);
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

/* Devuelve un PNG con canal alfa (fondo transparente salvo la caja del subtítulo),
   listo para superponerse al video con ffmpeg overlay. */
async function renderSubtitulo(guion){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnoart-sub-'));
  let browser;
  try{
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO } });
    await page.setContent(paginaSubtitulo(escHtml(guion)));
    await page.evaluate(() => document.fonts.ready);
    const framePath = path.join(dir, 'subtitulo.png');
    await page.screenshot({ path: framePath, omitBackground: true });
    await browser.close();
    browser = null;
    return fs.readFileSync(framePath);
  } finally {
    if(browser) await browser.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { renderSubtitulo };
