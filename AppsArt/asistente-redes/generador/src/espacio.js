'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/* Formato "editorial" de Casa Quinta Tres Estaciones: foto REAL del predio a página
   completa (nunca una imagen inventada/stock — es la única de las 4 cuentas sin producto
   físico para fotografiar en estudio, así que la fidelidad depende 100% de las fotos que
   mandó el cliente) + degradé verde bosque hacia abajo para legibilidad + texto superpuesto
   cálido/aspiracional. Confirmado con el cliente (opción 1: foto real + texto superpuesto,
   por sobre el formato "ficha" tipo Entre PyMES).

   Paleta y tipografía tomadas del PDF de branding real del cliente (Georgia para títulos,
   Jost para textos/UI) — nunca aproximadas. */

const LADO = 1080;

const MARCA = {
  cremaFondo: '#EDEAD9',
  cremaPapel: '#FAF7EE',
  verdeBosque: '#2C4A2E',
  verdeHoja: '#4A6741',
  dorado: '#C9943A'
};

const EMBLEMA = fs.readFileSync(path.join(__dirname, '../../app/logo-tresestaciones-emblema.png')).toString('base64');

function escHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* La tipografía de marca real es Georgia para títulos, pero Georgia no está en Google
   Fonts y no viene instalada en el runner de GitHub Actions (Ubuntu) — cae a una serif
   genérica ahí. Se usa Gelasio, la alternativa open-source de Google Fonts pensada como
   reemplazo métricamente compatible de Georgia (mismo diseño, mismas proporciones). */
function estiloBase(){
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Gelasio:ital,wght@0,400;0,700;1,400&family=Jost:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box; margin:0; padding:0;}
    html,body{width:${LADO}px; height:${LADO}px; overflow:hidden; font-family:'Jost', Arial, sans-serif;}
    .lienzo{width:${LADO}px; height:${LADO}px; position:relative;}
  </style>`;
}

/* fotoBase64: la foto real ya normalizada a JPEG (foto-real-tresestaciones.js). Las fotos
   reales son verticales de celular (9:16 o 3:4) recortadas a este lienzo cuadrado — si el
   elemento que importa (ej. la pileta) queda en el tercio inferior de la foto original, un
   recorte centrado lo tapa detrás del texto. `foco` (opcional, por foto, en
   tresestaciones-fotos.json) corrige el punto de recorte vertical: 'bottom' para esos casos. */
function renderEspacioHtml({ fotoBase64, foco, eyebrow, titulo, texto, cta }){
  const posicionFoto = foco === 'bottom' ? 'center 80%' : foco === 'top' ? 'center 20%' : 'center';
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="lienzo">
      <img src="data:image/jpeg;base64,${fotoBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posicionFoto};">
      <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(44,74,46,0.05) 0%, rgba(44,74,46,0.30) 50%, rgba(44,74,46,0.94) 100%);"></div>
      <div style="position:absolute; top:56px; left:56px; width:104px; height:104px; border-radius:50%; background:${MARCA.cremaPapel}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25);">
        <img src="data:image/png;base64,${EMBLEMA}" style="width:66px; height:66px;">
      </div>
      <div style="position:relative; z-index:1; display:flex; flex-direction:column; justify-content:flex-end; height:100%; padding:64px; color:${MARCA.cremaPapel};">
        ${eyebrow ? `<div style="font-size:23px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:${MARCA.dorado}; margin-bottom:18px;">${escHtml(eyebrow)}</div>` : ''}
        <div style="font-family:'Gelasio', Georgia, 'Times New Roman', serif; font-size:64px; line-height:1.18; margin-bottom:22px;">${escHtml(titulo)}</div>
        ${texto ? `<div style="font-size:29px; font-weight:400; line-height:1.5; color:rgba(250,247,238,0.88); max-width:900px; margin-bottom:32px;">${escHtml(texto)}</div>` : ''}
        <span style="background:${MARCA.dorado}; color:${MARCA.verdeBosque}; font-weight:700; font-size:26px; padding:18px 34px; border-radius:999px; display:inline-block; width:fit-content;">${escHtml(cta || 'Consultá por WhatsApp')}</span>
      </div>
    </div>
  </body></html>`;
}

async function renderEspacio({ fotoBuffer, foco, eyebrow, titulo, texto, cta }){
  const html = renderEspacioHtml({ fotoBase64: fotoBuffer.toString('base64'), foco, eyebrow, titulo, texto, cta });
  const browser = await chromium.launch();
  try{
    const page = await browser.newPage({ viewport: { width: LADO, height: LADO } });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({ type: 'png' });
  } finally {
    await browser.close();
  }
}

module.exports = { renderEspacio };
