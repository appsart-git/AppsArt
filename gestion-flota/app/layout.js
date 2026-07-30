import "./globals.css";

export const metadata = {
  title: "Gestión de Flota",
  description: "Gestión de compra, venta y gastos de la flota de vehículos entre socios.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Flota" },
};

export const viewport = {
  themeColor: "#E8A33D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
