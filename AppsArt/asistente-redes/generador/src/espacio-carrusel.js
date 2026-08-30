'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/* Versión carrusel del post editorial de Casa Quinta Tres Estaciones (ver espacio.js):
   en vez de una sola foto real, muestra varias del mismo tema en un solo posteo — más
   fiel a un lugar físico que se recorre con la vista, y aprovecha mejor el banco de fotos
   reales (rota menos rápido que publicar de a una). Misma identidad de marca real que
   espacio.js (paleta/tipografía del PDF del cliente), pero como módulo aparte: cada
   render de este proyecto es independiente (mismo criterio que ficha.js/carrusel.js),
   no comparten estado ni imports entre sí.

   Estructura fija: portada (foto + gancho) → N fotos de contenido (foto + línea corta) →
   cierre (sin foto, isologo real sobre fondo sólido + CTA). */

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

function estiloBase(){
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Gelasio:ital,wght@0,400;0,700;1,400&family=Jost:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box; margin:0; padding:0;}
    html,body{width:${LADO}px; height:${LADO}px; overflow:hidden; font-family:'Jost', Arial, sans-serif;}
    .lienzo{width:${LADO}px; height:${LADO}px; position:relative;}
  </style>`;
}

function posicionFoto(foco){
  return foco === 'bottom' ? 'center 80%' : foco === 'top' ? 'center 20%' : 'center';
}

function badgeEmblema(){
  return `<div style="position:absolute; top:56px; left:56px; width:96px; height:96px; border-radius:50%; background:${MARCA.cremaPapel}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25);">
    <img src="data:image/png;base64,${EMBLEMA}" style="width:60px; height:60px;">
  </div>`;
}

function slidePortadaHtml({ fotoBase64, foco, eyebrow, titulo, subtitulo }){
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="lienzo">
      <img src="data:image/jpeg;base64,${fotoBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posicionFoto(foco)};">
      <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(44,74,46,0.08) 0%, rgba(44,74,46,0.32) 50%, rgba(44,74,46,0.95) 100%);"></div>
      ${badgeEmblema()}
      <div style="position:relative; z-index:1; display:flex; flex-direction:column; justify-content:flex-end; height:100%; padding:64px; color:${MARCA.cremaPapel};">
        ${eyebrow ? `<div style="font-size:22px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:${MARCA.dorado}; margin-bottom:16px;">${escHtml(eyebrow)}</div>` : ''}
        <div style="font-family:'Gelasio', Georgia, serif; font-size:60px; line-height:1.16; margin-bottom:18px;">${escHtml(titulo)}</div>
        ${subtitulo ? `<div style="font-size:27px; font-weight:400; line-height:1.5; color:rgba(250,247,238,0.88); max-width:900px;">${escHtml(subtitulo)}</div>` : ''}
      </div>
    </div>
  </body></html>`;
}

function slideContenidoHtml({ fotoBase64, foco, texto }){
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="lienzo">
      <img src="data:image/jpeg;base64,${fotoBase64}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posicionFoto(foco)};">
      <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(44,74,46,0.02) 0%, rgba(44,74,46,0.10) 65%, rgba(44,74,46,0.82) 100%);"></div>
      <div style="position:relative; z-index:1; display:flex; align-items:flex-end; height:100%; padding:56px 64px;">
        <div style="font-size:32px; font-weight:500; color:${MARCA.cremaPapel}; line-height:1.4; max-width:920px; text-shadow:0 2px 8px rgba(0,0,0,0.35);">${escHtml(texto)}</div>
      </div>
    </div>
  </body></html>`;
}

function slideCierreHtml({ titulo, cta }){
  return `<!doctype html><html><head>${estiloBase()}</head><body>
    <div class="lienzo" style="background:${MARCA.verdeBosque}; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:90px; color:${MARCA.cremaPapel};">
      <div style="width:180px; height:180px; border-radius:50%; background:${MARCA.cremaPapel}; display:flex; align-items:center; justify-content:center; margin-bottom:40px; box-shadow:0 4px 24px rgba(0,0,0,0.3);">
        <img src="data:image/png;base64,${EMBLEMA}" style="width:120px; height:120px;">
      </div>
      <div style="font-family:'Gelasio', Georgia, serif; font-size:52px; line-height:1.22; margin-bottom:32px;">${escHtml(titulo)}</div>
      <span style="background:${MARCA.dorado}; color:${MARCA.verdeBosque}; font-weight:700; font-size:28px; padding:20px 40px; border-radius:999px; display:inline-block;">${escHtml(cta || 'Consultá por WhatsApp')}</span>
    </div>
  </body></html>`;
}

/* slides: array de {tipo:'portada'|'contenido'|'cierre', fotoBuffer (Buffer, no aplica en
   'cierre'), foco, ...resto de datos de esa lámina}. Reusa un solo browser para las N
   láminas (mismo patrón que subtitulo-tecnoart.js). */
async function renderEspacioCarrusel(slides){
  const browser = await chromium.launch();
  try{
    const page = await browser.newPage({ viewport: { width: LADO, height: LADO } });
    const buffers = [];
    for(const slide of slides){
      const datos = { ...slide, fotoBase64: slide.fotoBuffer ? slide.fotoBuffer.toString('base64') : undefined };
      const html = datos.tipo === 'portada' ? slidePortadaHtml(datos)
        : datos.tipo === 'cierre' ? slideCierreHtml(datos)
        : slideContenidoHtml(datos);
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      buffers.push(await page.screenshot({ type: 'png' }));
    }
    return buffers;
  } finally {
    await browser.close();
  }
}

module.exports = { renderEspacioCarrusel };
