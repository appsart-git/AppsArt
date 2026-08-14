"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Clock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "@/components/StatusBadge";

export default function EnfermeroDashboard() {
  const router = useRouter();
  const [enfermero, setEnfermero] = useState(null);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/enfermero/login");
        return;
      }
      const { data: enfermeroRow } = await supabase.from("enfermeros").select("*").eq("id", user.id).single();
      setEnfermero(enfermeroRow);

      if (enfermeroRow?.estado === "aprobado") {
        const { data: pedidosRows } = await supabase
          .from("pedidos")
          .select("*")
          .eq("enfermero_id", user.id)
          .order("fecha", { ascending: true });
        setPedidos(pedidosRows || []);
      }
    }
    load();
  }, [router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!enfermero) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando…</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Hola,</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>{enfermero.nombre}</div>
        </div>
        <button className="btn-ghost" onClick={cerrarSesion} style={{ padding: "9px 12px" }}>
          <LogOut size={16} />
        </button>
      </div>

      {enfermero.estado !== "aprobado" && (
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20 }}>
          <Clock size={20} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              <StatusBadge estado={enfermero.estado} />
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              {enfermero.estado === "pendiente"
                ? "Estamos revisando tu matrícula. Te avisamos cuando quedes activo."
                : "Tu matrícula no fue aprobada. Contactanos para más info."}
            </div>
          </div>
        </div>
      )}

      {enfermero.estado === "aprobado" && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14, color: "var(--text-muted)" }}>
            Tus turnos asignados
          </div>
          {pedidos.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Todavía no tenés turnos asignados.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pedidos.map((p) => (
              <div key={p.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 600 }}>{p.tipo_servicio}</div>
                  <StatusBadge estado={p.estado} />
                </div>
                <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6 }}>
                  {p.zona} · {p.fecha} · {p.horario}
                </div>
                {p.notas && (
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6 }}>{p.notas}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
