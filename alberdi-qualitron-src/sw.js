/* Service worker mínimo: habilita la instalación como app. Sin caché a propósito, así la app siempre
   carga la última versión publicada (los datos van por Firestore, que ya tiene su propia caché offline). */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(){});
