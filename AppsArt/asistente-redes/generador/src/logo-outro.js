'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

/* Cierre de marca para los reels de Tecno Art: el logo real (el mismo PNG que ya usa
   el sitio, fondo verde de marca incluido) con un efecto de scanline por CSS — nunca se
   le pide a ningún modelo generativo que lo dibuje o modifique (regla dura del proyecto:
   ver memoria "logo-assets-never-regenerated"). Se renderiza frame a frame con Playwright
   (mismo mecanismo que carrusel.js/ficha.js) y se encodea a un clip mudo corto con ffmpeg,
   para pegarlo al final del clip de producto que genera Runway. */

const ANCHO = 720, ALTO = 1280;
const FPS = 24;
const DURACION_SEG = 1.8;

const LOGO_FULL = fs.readFileSync(path.join(__dirname, '../../app/logo-tecnoart.png')).toString('base64');

function paginaOutro(){
  return `<!doctype html><html><head><style>
    *{margin:0;padding:0;}
    html,body{width:${ANCHO}px;height:${ALTO}px;overflow:hidden;background:#15EF1D;}
    .lienzo{width:${ANCHO}px;height:${ALTO}px;position:relative;display:flex;align-items:center;justify-content:center;background:#15EF1D;}
    .logo{width:560px;}
    .scan{position:absolute;left:0;right:0;height:160px;
      background:linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0.38) 50%, rgba(0,0,0,0) 100%);
      animation:sweep ${DURACION_SEG}s linear infinite;}
    @keyframes sweep{ from{ top:-160px; } to{ top:${ALTO}px; } }
  </style></head><body>
    <div class="lienzo">
      <div class="scan"></div>
      <img class="logo" src="data:image/png;base64,${LOGO_FULL}">
    </div>
  </body></html>`;
}

async function renderLogoOutro(){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnoart-outro-'));
  let browser;
  try{
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO } });
    await page.setContent(paginaOutro());
    await page.evaluate(() => document.fonts.ready);

    const totalFrames = Math.round(FPS * DURACION_SEG);
    for(let i = 0; i < totalFrames; i++){
      const tMs = (i / FPS) * 1000;
      await page.evaluate((t) => {
        document.getAnimations().forEach(a => { a.currentTime = t; });
      }, tMs);
      await page.screenshot({ path: path.join(dir, `frame${String(i).padStart(4, '0')}.png`) });
    }
    await browser.close();
    browser = null;

    const outroPath = path.join(dir, 'outro.mp4');
    await execFileAsync('ffmpeg', [
      '-y', '-framerate', String(FPS), '-i', path.join(dir, 'frame%04d.png'),
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-t', String(DURACION_SEG),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', outroPath
    ]);
    return fs.readFileSync(outroPath);
  } finally {
    if(browser) await browser.close().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { renderLogoOutro };
