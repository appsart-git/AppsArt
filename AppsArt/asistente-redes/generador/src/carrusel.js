'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/* Genera carruseles renderizando HTML/CSS real (mismo mecanismo que Claude Design,
   pero ejecutable sin sesión interactiva) en vez de pedirle a un modelo de imágenes
   que "adivine" la identidad de marca a partir de una descripción de texto.
   El formato (canvas cuadrado, logo protagonista en la portada, contador de página)
   está calcado de carruseles reales ya publicados en @appsart (ver AppsArt/appsart-slide-*.png
   y el ejemplo de "control de stock" en la raíz del repo).
   Para que dos posts seguidos no salgan idénticos (más allá del texto), cada carrusel
   sortea: qué láminas van con fondo oscuro/claro, y qué variante de layout usa la
   lámina 2. Hoy solo lo usa AppsArt (ver MARCA en este archivo) — cuando haya una
   segunda cuenta con este formato, conviene mover estos tokens a un campo `cuenta.marca`
   en Firestore en vez de tenerlos hardcodeados acá. */

const LADO = 1080; // carrusel cuadrado (1:1), igual que el feed real de @appsart

// Colores sampleados pixel a pixel de los carruseles reales ya publicados de AppsArt.
const MARCA = {
  fondoOscuro: '#15100D',
  fondoClaro: '#FAF8F6',
  acento: '#C26030',
  textoMuted: '#878481'
};

// Logo real (no uno "aproximado" en CSS): versión clara recortada de un carrusel real
// (para fondo oscuro) y el archivo de marca original, en su variante oscura, para fondo claro.
const LOGO_PARA_OSCURO = fs.readFileSync(path.join(__dirname, '../../app/logo-wordmark-oscuro.png')).toString('base64');
const LOGO_PARA_CLARO = fs.readFileSync(path.join(__dirname, '../../app/logo-wordmark.png')).toString('base64');
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

/* El motivo de marca: 5 círculos ascendentes de chico a grande, en diagonal
   (calcado del recorte real — antes tenía 4 y el más grande quedaba cortado
   por el borde del SVG, se veía como una "gota" en vez de un círculo). */
function dotTrail(escala){
  const e = escala || 1;
  const dots = [
    { r: 4,   cx: 82, cy: 4  },
    { r: 6.5, cx: 68, cy: 16 },
    { r: 9.5, cx: 53, cy: 30 },
    { r: 13,  cx: 36, cy: 46 },
    { r: 18,  cx: 18, cy: 64 }
  ];
  return `<svg viewBox="0 0 90 86" width="${90 * e}" height="${86 * e}">${dots.map(d =>
    `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${MARCA.acento}"/>`).join('')}</svg>`;
}

function contador(n, total, colorMuted){
  return `<div class="eyebrow" style="color:${colorMuted};">${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>`;
}

/* bg/fg según si la lámina toca en oscuro o claro, decidido una vez por carrusel
   en renderCarrusel (no por lámina) para que el patrón sea coherente. */
function colores(oscuro){
  return oscuro
    ? { bg: MARCA.fondoOscuro, fg: MARCA.fondoClaro }
    : { bg: MARCA.fondoClaro, fg: MARCA.fondoOscuro };
}

function estiloBase(){
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap');
    *{box-sizing:border-box; margin:0; padding:0; font-family:'Manrope', Arial, sans-serif;}
    html,body{width:${LADO}px; height:${LADO}px; overflow:hidden;}
    .eyebrow{font-size:19px; font-weight:700; letter-spacing:2px; text-transform:uppercase;}
    .slide{width:${LADO}px; height:${LADO}px; position:relative; display:flex; flex-direction:column; padding:60px;}
  </style>`;
}

/* Portada: el logo real es el protagonista (grande, centrado), no un detalle al pie. */
function slidePortada({ eyebrow, titulo, subtitulo }, ctx){
  const { bg, fg } = colores(ctx.oscuro);
  const logo = ctx.oscuro ? LOGO_PARA_OSCURO : LOGO_PARA_CLARO;
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${bg}; color:${fg}; align-items:center; text-align:center;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
        <div class="eyebrow" style="color:${MARCA.textoMuted};">${escHtml(eyebrow)}</div>
        ${dotTrail()}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:38px;">
        <img src="data:image/png;base64,${logo}" style="width:78%; max-width:640px;">
        <div style="font-size:80px; font-weight:800; line-height:1.15;">${marcarAcento(titulo)}</div>
        ${subtitulo ? `<div style="font-size:46px; font-weight:500; color:${MARCA.textoMuted}; max-width:85%;">${marcarAcento(subtitulo)}</div>` : ''}
      </div>
    </div>
  </body></html>`;
}

function cabeceraContenido(ctx, fg){
  // El isologo chico solo existe en versión oscura (para fondo claro); en fondo
  // oscuro el motivo de puntos solo alcanza como marca de esquina.
  const marca = ctx.oscuro
    ? dotTrail(0.55)
    : `<img src="data:image/png;base64,${ICONO_A}" style="height:34px;">`;
  return `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      ${marca}
      <div style="display:flex; align-items:center; gap:14px;">${dotTrail(0.6)}${contador(ctx.numero, ctx.total, MARCA.textoMuted)}</div>
    </div>`;
}

/* Lámina 2, variante "dolor": titular grande (hasta 3 líneas) + línea de apoyo.
   Calcado de carruseles reales ya publicados — sin grilla de íconos. */
function slideContenidoDolor({ titulo, subtitulo }, ctx){
  const { bg, fg } = colores(ctx.oscuro);
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${bg}; color:${fg};">
      ${cabeceraContenido(ctx, fg)}
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:28px;">
        <div style="font-size:64px; font-weight:800; line-height:1.18;">${marcarAcento(titulo)}</div>
        ${subtitulo ? `<div style="font-size:46px; font-weight:500; color:${MARCA.textoMuted}; line-height:1.4;">${marcarAcento(subtitulo)}</div>` : ''}
      </div>
    </div>
  </body></html>`;
}

/* Lámina 2, variante "contraste": dos líneas cortas antes/ahora en vez de un
   titular corrido — mismo ADN de marca, composición distinta para que dos
   posts seguidos no se vean calcados uno del otro. */
function slideContenidoContraste({ antes, ahora }, ctx){
  const { bg, fg } = colores(ctx.oscuro);
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${bg}; color:${fg};">
      ${cabeceraContenido(ctx, fg)}
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:20px;">
        <div>
          <div class="eyebrow" style="color:${MARCA.textoMuted};">Antes</div>
          <div style="font-size:46px; font-weight:500; color:${MARCA.textoMuted}; line-height:1.4; margin-top:8px;">${escHtml(antes)}</div>
        </div>
        <div style="margin-top:20px;">
          <div class="eyebrow" style="color:${MARCA.acento};">Ahora</div>
          <div style="font-size:64px; font-weight:800; line-height:1.18; margin-top:8px;">${marcarAcento(ahora)}</div>
        </div>
      </div>
    </div>
  </body></html>`;
}

/* Lámina 2, variante "grilla": título corto + 6 beneficios en círculos-contorno,
   3 columnas × 2 filas. La misma que ya salió en el primer post real publicado. */
function slideContenidoGrilla({ titulo, items }, ctx){
  const { bg, fg } = colores(ctx.oscuro);
  const celdas = (items || []).slice(0, 6);
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${bg}; color:${fg};">
      ${cabeceraContenido(ctx, fg)}
      <div style="font-size:38px; font-weight:800; line-height:1.2; margin:22px 0 30px;">${marcarAcento(titulo)}</div>
      <div style="flex:1; display:flex; align-items:center; justify-content:center;">
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; row-gap:56px; column-gap:30px;">
          ${celdas.map(it => `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; gap:18px; width:250px;">
              <div style="width:196px; height:196px; border-radius:50%; border:3px solid ${MARCA.acento}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${iconoSvg(it.icono)}
              </div>
              <div style="font-size:24px; font-weight:700; line-height:1.3;">${escHtml(it.label)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </body></html>`;
}

const VARIANTES_CONTENIDO = [slideContenidoDolor, slideContenidoContraste, slideContenidoGrilla];

function slideCierre({ titulo, cta }, ctx){
  const { bg, fg } = colores(ctx.oscuro);
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="slide" style="background:${bg}; color:${fg};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        ${contador(ctx.numero, ctx.total, MARCA.textoMuted)}
        ${dotTrail()}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:44px;">
        <div style="font-size:84px; font-weight:800; line-height:1.12; max-width:960px;">${marcarAcento(titulo)}</div>
        <span style="background:${MARCA.acento}; color:${MARCA.fondoOscuro}; font-weight:800; font-size:30px; padding:22px 38px; border-radius:999px; display:inline-block; width:fit-content;">${escHtml(cta)}</span>
      </div>
    </div>
  </body></html>`;
}

/* Recibe el array `slides` que devuelve Claude (generarTextoCarrusel) y devuelve
   un Buffer PNG por lámina, en el mismo orden. */
async function renderCarrusel(slides){
  // Se sortea una sola vez por carrusel (no por lámina) para que el patrón de
  // fondos y la variante de la lámina 2 sean coherentes dentro del mismo post.
  const oscuroPortadaCierre = Math.random() < 0.5;
  const varianteContenido = VARIANTES_CONTENIDO[Math.floor(Math.random() * VARIANTES_CONTENIDO.length)];

  const browser = await chromium.launch();
  try{
    const page = await browser.newPage({ viewport: { width: LADO, height: LADO } });
    const buffers = [];
    for(let i = 0; i < slides.length; i++){
      const slide = slides[i];
      const esContenido = slide.tipo === 'contenido';
      const render = slide.tipo === 'portada' ? slidePortada : esContenido ? varianteContenido : slideCierre;
      const ctx = {
        numero: i + 1, total: slides.length,
        oscuro: esContenido ? !oscuroPortadaCierre : oscuroPortadaCierre
      };
      await page.setContent(render(slide, ctx), { waitUntil: 'networkidle' });
      // networkidle no garantiza que la tipografía web ya esté aplicada al layout
      // (se vio texto en blanco por esta carrera en una corrida de prueba local).
      await page.evaluate(() => document.fonts.ready);
      buffers.push(await page.screenshot({ type: 'png' }));
    }
    return buffers;
  } finally {
    await browser.close();
  }
}

module.exports = { renderCarrusel };
