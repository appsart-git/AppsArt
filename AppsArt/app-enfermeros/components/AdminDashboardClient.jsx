"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Check, X, FileText } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const ESTADOS_PEDIDO = ["pendiente", "asignado", "confirmado", "en_curso", "completado", "cancelado"];

export default function AdminDashboardClient({ enfermerosIniciales, pedidosIniciales }) {
  const router = useRouter();
  const [tab, setTab] = useState("enfermeros");
  const [enfermeros, setEnfermeros] = useState(enfermerosIniciales);
  const [pedidos, setPedidos] = useState(pedidosIniciales);

  const pendientes = enfermeros.filter((e) => e.estado === "pendiente");
  const aprobados = enfermeros.filter((e) => e.estado === "aprobado");

  async function actualizarEnfermero(id, estado) {
    const res = await fetch(`/api/admin/enfermeros/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      setEnfermeros((prev) => prev.map((e) => (e.id === id ? { ...e, estado } : e)));
    }
  }

  async function actualizarPedido(id, campos) {
    const res = await fetch(`/api/admin/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (res.ok) {
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...campos } : p)));
    }
  }

  async function cerrarSesion() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>Panel de administración</div>
        <button className="btn-ghost" onClick={cerrarSesion} style={{ padding: "9px 12px" }}>
          <LogOut size={16} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={tab === "enfermeros" ? "btn-primary" : "btn-ghost"}
          onClick={() => setTab("enfermeros")}
        >
          Enfermeros {pendientes.length > 0 && `(${pendientes.length})`}
        </button>
        <button className={tab === "pedidos" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("pedidos")}>
          Pedidos
        </button>
      </div>

      {tab === "enfermeros" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {enfermeros.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Todavía no hay enfermeros registrados.</div>
          )}
          {enfermeros.map((e) => (
            <div key={e.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.nombre}</div>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                    Matrícula {e.matricula} · {e.zona} · {e.telefono}
                  </div>
                </div>
                <StatusBadge estado={e.estado} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {e.matricula_archivo_url && (
                  <a
                    className="btn-ghost"
                    style={{ padding: "8px 12px", fontSize: 13 }}
                    href={`/api/admin/enfermeros/${e.id}/matricula`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={15} /> Ver matrícula
                  </a>
                )}
                {e.estado !== "aprobado" && (
                  <button
                    className="btn-primary"
                    style={{ padding: "8px 12px", fontSize: 13 }}
                    onClick={() => actualizarEnfermero(e.id, "aprobado")}
                  >
                    <Check size={15} /> Aprobar
                  </button>
                )}
                {e.estado !== "rechazado" && (
                  <button
                    className="btn-ghost"
                    style={{ padding: "8px 12px", fontSize: 13, color: "var(--red)", borderColor: "var(--red)" }}
                    onClick={() => actualizarEnfermero(e.id, "rechazado")}
                  >
                    <X size={15} /> Rechazar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "pedidos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pedidos.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Todavía no hay pedidos.</div>
          )}
          {pedidos.map((p) => (
            <div key={p.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.tipo_servicio}</div>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                    {p.pacientes?.nombre} · {p.pacientes?.telefono}
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
                    {p.zona} · {p.fecha} · {p.horario}
                  </div>
                </div>
                <StatusBadge estado={p.estado} />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <select
                  value={p.enfermero_id || ""}
                  onChange={(e) =>
                    actualizarPedido(p.id, {
                      enfermero_id: e.target.value || null,
                      estado: e.target.value ? "asignado" : "pendiente",
                    })
                  }
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)" }}
                >
                  <option value="">Sin asignar</option>
                  {aprobados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.zona})
                    </option>
                  ))}
                </select>

                <select
                  value={p.estado}
                  onChange={(e) => actualizarPedido(p.id, { estado: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)" }}
                >
                  {ESTADOS_PEDIDO.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>

                <select
                  value={p.pago_estado}
                  onChange={(e) => actualizarPedido(p.id, { pago_estado: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)" }}
                >
                  <option value="pendiente">Pago pendiente</option>
                  <option value="pagado">Pagado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
