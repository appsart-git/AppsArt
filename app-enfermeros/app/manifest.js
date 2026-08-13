export default function manifest() {
  return {
    name: "Enfermeros a Domicilio",
    short_name: "Enfermeros",
    description: "Pedí un enfermero matriculado a domicilio, o sumate como enfermero a la plataforma.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f9f9",
    theme_color: "#0e7c73",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
