export default function manifest() {
  return {
    name: "Gestión de Flota",
    short_name: "Flota",
    description: "Gestión de compra, venta y gastos de la flota de vehículos entre socios.",
    start_url: "/",
    display: "standalone",
    background_color: "#14171A",
    theme_color: "#E8A33D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
