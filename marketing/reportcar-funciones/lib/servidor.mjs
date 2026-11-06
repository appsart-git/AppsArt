// Servidor estático mínimo de la demo Tu Taller (mismo código que https://tutaller-prueba.web.app/).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const DEMO = path.resolve(AQUI, '../../../demo-tutaller-src');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
export function servir(port = 8797, raiz = DEMO){
  return new Promise(res => {
    const s = http.createServer((req, r) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html';
      const f = path.join(raiz, p);
      if(!f.startsWith(raiz)){ r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, d) => { if(e){ r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
    }).listen(port, () => res(s));
  });
}
