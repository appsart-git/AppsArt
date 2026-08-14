import "./globals.css";

export const metadata = {
  title: "Enfermeros a Domicilio",
  description: "Conectamos enfermeros matriculados con pacientes que necesitan atención a domicilio.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Enfermeros" },
};

export const viewport = {
  themeColor: "#0e7c73",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
