export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function sumGastos(v) {
  return (v.gastos || []).reduce((a, g) => a + (Number(g.monto) || 0), 0);
}

export function costoTotal(v) {
  return (Number(v.precioCompra) || 0) + sumGastos(v);
}

export function ganancia(v) {
  if (v.estado !== "vendido") return null;
  return (Number(v.precioVenta) || 0) - costoTotal(v);
}

export function pctSum(participaciones) {
  return (participaciones || []).reduce((a, p) => a + (Number(p.porcentaje) || 0), 0);
}

export const ESTADOS = {
  STOCK: "en_stock",
  VENDIDO: "vendido",
};

export const TIPO_GASTO = ["Reparación mecánica", "Acondicionamiento / Limpieza", "Documentación / Trámites", "Repuestos", "Otro"];

export const CONDICIONES = ["Excelente", "Muy buena", "Buena", "Regular", "Para repuestos"];

export const DOCUMENTACIONES = ["Al día", "En trámite", "Con observaciones"];

export const PALETTE_SOCIOS = ["#E8A33D", "#4C8DFF", "#34B27B", "#E15252", "#C77DFF", "#5FD3C4"];
