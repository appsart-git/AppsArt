// Subir la versión de CACHE_NAME en cada deploy que toque HTML/JS fuerza a limpiar la caché vieja
// (ver 'activate' más abajo) — si no, un service worker con caché desactualizada puede quedar
// sirviendo código viejo indefinidamente a usuarios que ya habían abierto la app antes.
const CACHE_NAME = 'multiescapes-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './app-config.js',
  './app-informe.js',
  './app-clientes.js',
  './app-trabajos.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './logo-multiescapes.png'
];

// HTML y JS: se sirven "red primero" para que un deploy nuevo se vea de inmediato; si no hay
// conexión, se cae a la última copia cacheada (para que la app siga andando offline).
const NETWORK_FIRST_RE = /\.(?:html|js)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

async function networkFirst(request){
  const cache = await caches.open(CACHE_NAME);
  try{
    const response = await fetch(request);
    if(response && response.ok) cache.put(request, response.clone());
    return response;
  }catch(err){
    const cached = await cache.match(request);
    if(cached) return cached;
    throw err;
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if(response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isAppCode = event.request.mode === 'navigate' || NETWORK_FIRST_RE.test(url.pathname);
  event.respondWith(isAppCode ? networkFirst(event.request) : cacheFirst(event.request));
});
