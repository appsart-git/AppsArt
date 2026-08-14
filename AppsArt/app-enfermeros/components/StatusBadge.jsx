const LABELS = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  asignado: "Asignado",
  confirmado: "Confirmado",
  en_curso: "En curso",
  completado: "Completado",
  cancelado: "Cancelado",
};

export default function StatusBadge({ estado }) {
  return <span className={`badge badge-${estado}`}>{LABELS[estado] || estado}</span>;
}
