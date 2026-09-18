'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/* Formato "ficha de producto" de Entre PyMES: imagen única (no carrusel, a diferencia
   de AppsArt), calcada de los posts reales ya publicados en su IG — foto de la máquina
   a pantalla completa, degradé navy hacia abajo para legibilidad, nombre + specs reales
   (nunca inventadas) y botón CTA cian. Institucionales (Quiénes somos, etc.) usan un
   fondo navy sólido con el isologo real, sin foto. */

const LADO = 1080;

// Colores sampleados pixel a pixel de un post real ya publicado (@entrepymes).
const MARCA = {
  navy: '#141f42',
  acento: '#00c4e0',
  blanco: '#ffffff',
  muted: 'rgba(255,255,255,0.72)'
};

const LOGO_FULL = fs.readFileSync(path.join(__dirname, '../../app/logo-entrepymes.png')).toString('base64');

function escHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function estiloBase(){
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap');
    *{box-sizing:border-box; margin:0; padding:0; font-family:'Manrope', Arial, sans-serif;}
    html,body{width:${LADO}px; height:${LADO}px; overflow:hidden;}
    .lienzo{width:${LADO}px; height:${LADO}px; position:relative; display:flex; flex-direction:column;}
    .eyebrow{font-size:22px; font-weight:700; letter-spacing:2px; text-transform:uppercase;}
  </style>`;
}

/* Ficha de producto: foto real de la máquina + specs reales tomadas de la web
   (nunca inventar características que no vinieron del scraping/carga real). */
function renderFichaProducto({ fotoUrl, nombre, specs, cta }){
  const items = (specs || []).slice(0, 4);
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="lienzo">
      <img src="${fotoUrl}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
      <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(20,31,66,0.15) 0%, rgba(20,31,66,0.55) 55%, rgba(20,31,66,0.96) 100%);"></div>
      <div style="position:relative; z-index:1; display:flex; flex-direction:column; height:100%; padding:56px;">
        <div style="display:flex; justify-content:flex-end;">
          <div style="background:${MARCA.blanco}; border-radius:50%; width:184px; height:184px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25);">
            <img src="data:image/png;base64,${LOGO_FULL}" style="width:156px; height:156px;">
          </div>
        </div>
        <div style="flex:1;"></div>
        <div style="display:flex; flex-direction:column; gap:24px; color:${MARCA.blanco};">
          <div style="font-size:56px; font-weight:800; line-height:1.15;">${escHtml(nombre)}</div>
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${items.map(s => `
              <div style="display:flex; align-items:flex-start; gap:14px; font-size:29px; font-weight:500; color:${MARCA.muted}; line-height:1.35;">
                <span style="color:${MARCA.acento}; font-weight:800; flex-shrink:0;">&#9656;</span>
                <span>${escHtml(s)}</span>
              </div>`).join('')}
          </div>
          <span style="background:${MARCA.acento}; color:${MARCA.navy}; font-weight:800; font-size:28px; padding:20px 36px; border-radius:999px; display:inline-block; width:fit-content; margin-top:8px;">${escHtml(cta || 'Consultá disponibilidad')}</span>
        </div>
      </div>
    </div>
  </body></html>`;
}

/* Institucional (Quiénes somos, Misión, Visión, etc.): sin foto, isologo real
   protagonista sobre navy sólido, mismo ADN de marca que la ficha de producto. */
function renderInstitucional({ eyebrow, titulo, texto }){
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="lienzo" style="background:${MARCA.navy}; color:${MARCA.blanco}; align-items:center; justify-content:center; text-align:center; padding:80px;">
      <div style="background:${MARCA.blanco}; border-radius:50%; width:280px; height:280px; display:flex; align-items:center; justify-content:center; margin-bottom:44px; box-shadow:0 4px 24px rgba(0,0,0,0.3);">
        <img src="data:image/png;base64,${LOGO_FULL}" style="width:220px;">
      </div>
      ${eyebrow ? `<div class="eyebrow" style="color:${MARCA.acento}; margin-bottom:22px;">${escHtml(eyebrow)}</div>` : ''}
      <div style="font-size:58px; font-weight:800; line-height:1.18; margin-bottom:30px;">${escHtml(titulo)}</div>
      ${texto ? `<div style="font-size:32px; font-weight:500; color:${MARCA.muted}; line-height:1.5; max-width:820px;">${escHtml(texto)}</div>` : ''}
    </div>
  </body></html>`;
}

async function renderImagenUnica(html){
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

async function renderFicha(datos){
  return renderImagenUnica(renderFichaProducto(datos));
}

async function renderInstitucionalImg(datos){
  return renderImagenUnica(renderInstitucional(datos));
}

module.exports = { renderFicha, renderInstitucionalImg };
