/* Service worker de Firebase Messaging — recibe los pushes cuando el panel admin
   no está abierto en primer plano. Tiene que vivir en la raíz del sitio (no en una
   subcarpeta) para poder controlar todo el dominio, y no puede leer variables del
   resto de la app (corre en su propio hilo aislado) — por eso el config está
   duplicado acá en vez de importado de firebase-init.js. */
importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDzgsiymVEL0nIbTxOnAbLSDkIp8LruMOg",
  authDomain: "cuidahoy-6442d.firebaseapp.com",
  projectId: "cuidahoy-6442d",
  storageBucket: "cuidahoy-6442d.firebasestorage.app",
  messagingSenderId: "332900296525",
  appId: "1:332900296525:web:9f44b591b8d3e9669a7904",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "CUIDAR+", {
    body: body || "",
    // Ruta relativa a la raíz del sitio (no absoluta con dominio) — así no se
    // rompe si el dominio de Netlify vuelve a cambiar.
    icon: "/img/icon-192.png",
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin.html";
  event.waitUntil(clients.openWindow(url));
});
