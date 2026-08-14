"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "@/components/StatusBadge";

const ZONAS = ["CABA Norte", "CABA Sur", "CABA Centro", "GBA Norte", "GBA Oeste", "GBA Sur"];
const TIPOS_SERVICIO = [
  "Curación",
  "Inyección / medicación",
  "Control de signos vitales",
  "Cuidado post-operatorio",
  "Otro",
];

export default function PacienteDashboard() {
  const router = useRouter();
  const [paciente, setPaciente] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tipo_servicio: TIPOS_SERVICIO[0],
    zona: ZONAS[0],
    fecha: "",
    horario: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/paciente/login");
        return;
      }
      const { data: pacienteRow } = await supabase.from("pacientes").select("*").eq("id", user.id).single();
      setPaciente(pacienteRow);

      const { data: pedidosRows } = await supabase
        .from("pedidos")
        .select("*")
        .eq("paciente_id", user.id)
        .order("created_at", { ascending: false });
      setPedidos(pedidosRows || []);
    }
    load();
  }, [router]);

  async function crearPedido(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("pedidos")
      .insert({ ...form, paciente_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPedidos((prev) => [data, ...prev]);
    setShowForm(false);
    setForm({ tipo_servicio: TIPOS_SERVICIO[0], zona: ZONAS[0], fecha: "", horario: "", notas: "" });
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!paciente) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando…</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Hola,</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>{paciente.nombre}</div>
        </div>
        <button className="btn-ghost" onClick={cerrarSesion} style={{ padding: "9px 12px" }}>
          <LogOut size={16} />
        </button>
      </div>

      {!showForm && (
        <button className="btn-primary" style={{ width: "100%", marginBottom: 20 }} onClick={() => setShowForm(true)}>
          <Plus size={17} /> Pedir un enfermero
        </button>
      )}

      {showForm && (
        <form onSubmit={crearPedido} className="card" style={{ marginBottom: 20 }}>
          <div className="field">
            <label>Tipo de servicio</label>
            <select
              value={form.tipo_servicio}
              onChange={(e) => setForm((f) => ({ ...f, tipo_servicio: e.target.value }))}
            >
              {TIPOS_SERVICIO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Zona</label>
            <select value={form.zona} onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}>
              {ZONAS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Horario</label>
            <input
              required
              placeholder="Ej: 14:00 a 16:00"
              value={form.horario}
              onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))}
            />
          </div>
          <div className="field">
            <label>Notas (opcional)</label>
            <textarea
              rows={3}
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            />
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? "Enviando…" : "Confirmar pedido"}
            </button>
          </div>
        </form>
      )}

      <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14, color: "var(--text-muted)" }}>
        Tus pedidos
      </div>
      {pedidos.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Todavía no hiciste ningún pedido.</div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
