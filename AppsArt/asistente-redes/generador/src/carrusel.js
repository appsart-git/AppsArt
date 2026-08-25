'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/* Genera carruseles renderizando HTML/CSS real (mismo mecanismo que Claude Design,
   pero ejecutable sin sesión interactiva) en vez de pedirle a un modelo de imágenes
   que "adivine" la identidad de marca a partir de una descripción de texto.
   El formato (canvas cuadrado, logo protagonista en la portada, grilla 3×2, contador
   de página) está calcado de los carruseles reales ya publicados en @appsart
   (ver AppsArt/appsart-slide-1.png, -2.png, -3.png en la raíz del repo).
   Hoy solo lo usa AppsArt (ver MARCA en este archivo) — cuando haya una segunda
   cuenta con este formato, conviene mover estos tokens a un campo `cuenta.marca`
   en Firestore en vez de tenerlos hardcodeados acá. */

const LADO = 1080; // carrusel cuadrado (1:1), igual que el feed real de @appsart

// Colores sampleados pixel a pixel de los carruseles reales ya publicados de AppsArt.
const MARCA = {
  fondoOscuro: '#15100D',
  fondoClaro: '#FAF8F6',
  acento: '#C26030',
  textoMuted: '#878481'
};

// Logo real recortado de los mismos carruseles (no un logo "aproximado" en CSS):
// versión clara (para fondo oscuro) y el ícono aislado de la "A" (para fondo claro).
const LOGO_CLARO = fs.readFileSync(path.join(__dirname, '../../app/logo-wordmark-oscuro.png')).toString('base64');
const ICONO_A = fs.readFileSync(path.join(__dirname, '../../app/icono-a.png')).toString('base64');

function escHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* "texto *clave* resto" -> resalta "clave" en naranja dentro de un titular. */
function marcarAcento(s){
  return escHtml(s).replace(/\*([^*]+)\*/g, `<span style="color:${MARCA.acento}">$1</span>`);
}

const ICONOS = {
  stock: '<path d="M6 10 L20 5 L34 10 L34 30 L20 35 L6 30 Z M6 10 L20 15 L34 10 M20 15 L20 35"/>',
  pago: '<rect x="9" y="4" width="22" height="32" rx="2"/><path d="M14 12h12M14 18h12M14 24h7"/><circle cx="27" cy="27" r="6"/><path d="M24.5 27l1.8 1.8L30 25"/>',
  produccion: '<circle cx="20" cy="20" r="7"/><path d="M20 5v5M20 30v5M5 20h5M30 20h5M9 9l3.5 3.5M27.5 27.5L31 31M31 9l-3.5 3.5M12.5 27.5L9 31"/>',
  informes: '<path d="M7 33V10M17 33V16M27 33V6M33 33H4"/>',
  ficha: '<rect x="8" y="4" width="24" height="32" rx="2"/><path d="M14 4v6h12V4M13 16h14M13 22h14M13 28h9"/>',
  clientes: '<circle cx="14" cy="13" r="5"/><circle cx="26" cy="13" r="5"/><path d="M4 33c0-6 4.5-10 10-10s10 4 10 10M20 33c0-6 4.5-10 10-10"/>'
};

function iconoSvg(nombre){
  const path_ = ICONOS[nombre] || ICONOS.ficha;
  return `<svg viewBox="0 0 40 40" width="108" height="108" fill="none" stroke="${MARCA.acento}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path_}</svg>`;
}

/* El motivo de marca: círculos ascendentes de chico a grande, en diagonal. */
function dotTrail(escala){
  const e = escala || 1;
  const dots = [{r:4,x:0,y:36},{r:7,x:14,y:26},{r:11,x:30,y:14},{r:16,x:50,y:-2}];
  return `<svg viewBox="0 0 70 55" width="${90 * e}" height="${70 * e}">${dots.map(d =>
    `<circle cx="${d.x + d.r}" cy="${d.y + d.r + 2}" r="${d.r}" fill="${MARCA.acento}"/>`).join('')}</svg>`;
}

function contador(n, total){
  return `<div class="eyebrow">${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>`;
}

function estiloBase(){
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap');
    *{box-sizing:border-box; margin:0; padding:0; font-family:'Manrope', Arial, sans-serif;}
    html,body{width:${LADO}px; height:${LADO}px; overflow:hidden;}
    .eyebrow{font-size:19px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:${MARCA.textoMuted};}
    .slide{width:${LADO}px; height:${LADO}px; position:relative; display:flex; flex-direction:column; padding:60px;}
  </style>`;
}

/* Portada: el logo real es el protagonista (grande, centrado), no un detalle al pie. */
function slidePortada({ eyebrow, titulo, subtitulo }, ctx){
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${MARCA.fondoOscuro}; color:${MARCA.fondoClaro}; align-items:center; text-align:center;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
        <div class="eyebrow">${escHtml(eyebrow)}</div>
        ${dotTrail()}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:38px;">
        <img src="data:image/png;base64,${LOGO_CLARO}" style="width:78%; max-width:640px;">
        <div style="font-size:68px; font-weight:800; line-height:1.15;">${marcarAcento(titulo)}</div>
        ${subtitulo ? `<div style="font-size:30px; font-weight:500; color:${MARCA.textoMuted}; max-width:85%;">${marcarAcento(subtitulo)}</div>` : ''}
      </div>
    </div>
  </body></html>`;
}

function slideContenido({ eyebrow, titulo, items }, ctx){
  const celdas = (items || []).slice(0, 6);
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${MARCA.fondoClaro}; color:${MARCA.fondoOscuro};">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <img src="data:image/png;base64,${ICONO_A}" style="height:34px;">
        ${contador(ctx.numero, ctx.total)}
      </div>
      <div class="eyebrow" style="margin-top:22px;">${escHtml(eyebrow)}</div>
      <div style="font-size:38px; font-weight:800; line-height:1.2; margin:10px 0 30px;">${marcarAcento(titulo)}</div>
      <div style="flex:1; display:flex; align-items:center; justify-content:center;">
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; row-gap:56px; column-gap:30px;">
          ${celdas.map(it => `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; gap:18px; width:250px;">
              <div style="width:196px; height:196px; border-radius:50%; border:3px solid ${MARCA.acento}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${iconoSvg(it.icono)}
              </div>
              <div style="font-size:22px; font-weight:700; line-height:1.3;">${escHtml(it.label)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </body></html>`;
}

function slideCierre({ titulo, cta }, ctx){
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${MARCA.fondoOscuro}; color:${MARCA.fondoClaro};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        ${contador(ctx.numero, ctx.total)}
        ${dotTrail()}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:44px;">
        <div style="font-size:78px; font-weight:800; line-height:1.12; max-width:920px;">${marcarAcento(titulo)}</div>
        <span style="background:${MARCA.acento}; color:${MARCA.fondoOscuro}; font-weight:800; font-size:27px; padding:20px 36px; border-radius:999px; display:inline-block; width:fit-content;">${escHtml(cta)}</span>
      </div>
    </div>
  </body></html>`;
}

const TEMPLATES = { portada: slidePortada, contenido: slideContenido, cierre: slideCierre };

/* Recibe el array `slides` que devuelve Claude (generarTextoCarrusel) y devuelve
   un Buffer PNG por lámina, en el mismo orden. */
async function renderCarrusel(slides){
  const browser = await chromium.launch();
  try{
    const page = await browser.newPage({ viewport: { width: LADO, height: LADO } });
    const buffers = [];
    for(let i = 0; i < slides.length; i++){
      const slide = slides[i];
      const render = TEMPLATES[slide.tipo] || TEMPLATES.contenido;
      await page.setContent(render(slide, { numero: i + 1, total: slides.length }), { waitUntil: 'networkidle' });
      buffers.push(await page.screenshot({ type: 'png' }));
    }
    return buffers;
  } finally {
    await browser.close();
  }
}

module.exports = { renderCarrusel };
