// Grabación de las escenas con Playwright (Edge instalado en la PC, sin bajar navegadores).
//   node grabar.mjs            -> todas las escenas
//   node grabar.mjs e1 e2 ...  -> solo esas
//   node grabar.mjs --full e5  -> además saca la página entera de cada paso (para armar el guion)
// Cada escena arranca en un contexto limpio + preparar() (reinicio de datos + fotos). Cada paso de
// escenas.mjs deja la app en un estado y se saca una captura: out/shots/<escena>-<paso>.png + .json
// (vw, vh, rectángulo del toque, mensaje de WhatsApp armado si lo hay, texto de la pantalla).
// Los botones de WhatsApp NO abren nada: se intercepta wa.me y solo se guarda el mensaje.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { servir } from './lib/servidor.mjs';
import { preparar } from './lib/preparar.mjs';
import { ESCENAS, VW, VH } from './escenas.mjs';

const PORT = 8797, BASE = `http://localhost:${PORT}/`;
const OUT = path.resolve('out/shots'); fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2), FULL = args.includes('--full');
const ids = args.filter(a => !a.startsWith('--'));
const lista = ids.length ? ids : Object.keys(ESCENAS);

const srv = await servir(PORT);
const browser = await chromium.launch({ channel: 'msedge' });
let fallas = 0;
for(const id of lista){
  const S = ESCENAS[id]; if(!S){ console.log(id, ': no existe'); fallas++; continue; }
  const vh = S.vh || VH, vw = S.vw || VW, movil = vw < 600;
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: S.dsf || 3, isMobile: movil, hasTouch: movil, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
  // WhatsApp: nada sale de la PC
  await ctx.route(/wa\.me|whatsapp\.com/, r => r.abort());
  ctx.on('page', p => { if(p.url().includes('wa.me')) p.close().catch(() => {}); });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__wa = null;
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href*="wa.me"]');
      if(a){ e.preventDefault(); window.__wa = a.href; }
    }, true);
    window.open = (u) => { if(String(u).includes('wa.me')) window.__wa = String(u); return null; };
  });
  for(const f of fs.readdirSync(OUT)) if(f.startsWith(id + '-')) fs.unlinkSync(path.join(OUT, f));
  try{
    const nFotos = await preparar(page, BASE);
    // sin la franja roja "DEMO" de arriba (igual que en los videos anteriores)
    await page.addStyleTag({ content: '.demo-banner{display:none!important} *{caret-color:transparent!important}' });
    const c = helpers(page);
    if(S.prep) await S.prep(c);
    for(let n = 0; n < S.steps.length; n++){
      const st = S.steps[n];
      await page.evaluate(() => { window.__wa = null; });
      if(st.do) await st.do(c);
      await page.waitForTimeout(st.wait ?? 450);
      const meta = { scene: id, step: n, last: n === S.steps.length - 1, vw, vh, dsf: S.dsf || 3 };
      if(st.tap){
        const loc = page.locator(st.tap).first();
        await loc.waitFor({ state: 'visible', timeout: 5000 });
        let bb = await loc.boundingBox();
        if(!bb || bb.y < 70 || bb.y + bb.height > vh - 80){
          await loc.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(250); bb = await loc.boundingBox();
        }
        meta.tap = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: bb.width, h: bb.height };
      }
      const wa = await page.evaluate(() => window.__wa);
      if(wa) meta.wa = decodeURIComponent((wa.split('text=')[1] || '').replace(/\+/g, ' '));
      if(st.waDe){ // mensaje de un botón de WhatsApp sin tocarlo (se lee el link armado)
        const href = await page.locator(st.waDe).first().getAttribute('href');
        meta.wa = decodeURIComponent((href.split('text=')[1] || '').replace(/\+/g, ' '));
      }
      if(st.meta) Object.assign(meta, await st.meta(c));
      meta.text = await page.evaluate(() => document.body.innerText);
      await page.screenshot({ path: path.join(OUT, `${id}-${n}.png`) });
      if(FULL) await page.screenshot({ path: path.join(OUT, `${id}-${n}-full.png`), fullPage: true });
      fs.writeFileSync(path.join(OUT, `${id}-${n}.json`), JSON.stringify(meta));
      console.log(`${id}-${n} ok${meta.tap ? ' tap' : ''}${meta.wa ? ' wa' : ''}`);
    }
    if(!lista.indexOf(id)) console.log(`(fotos cargadas en el taller: ${nFotos})`);
  }catch(e){ fallas++; console.log(id, 'ERROR', e.message.split('\n')[0]); await page.screenshot({ path: path.join(OUT, `${id}-ERROR.png`) }).catch(() => {}); }
  await ctx.close();
}
await browser.close(); srv.close();
process.exit(fallas ? 1 : 0);

function helpers(page){
  return {
    page,
    wait: ms => page.waitForTimeout(ms),
    run: (fn, arg) => page.evaluate(fn, arg),
    go: id => page.evaluate(i => goSection(i), id),
    click: async sel => { await page.locator(sel).first().click(); },
    // desplaza para que el elemento quede a `off` px del borde de arriba
    top: async (sel, off = 80) => { await page.locator(sel).first().evaluate((e, off) => window.scrollBy(0, e.getBoundingClientRect().top - off), off); },
    scroll: y => page.evaluate(y => window.scrollTo(0, y), y),
    type: async (sel, txt, delay = 0) => { const l = page.locator(sel).first(); await l.fill(''); await l.pressSequentially(txt, { delay }); },
  };
}
