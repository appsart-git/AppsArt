"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFleetData } from "@/lib/FleetDataContext";
import { PageHeader, EmptyState } from "../ui";
import { FormSocio } from "../forms/FormSocio";
import { ganancia, money } from "@/lib/derived";

export function SociosView() {
  const { socios, vehiculos, loading, addSocio, deleteSocio } = useFleetData();
  const [modal, setModal] = useState(null);

  const gananciaPorSocio = useMemo(() => {
    const map = {};
    socios.forEach((s) => (map[s.id] = 0));
    vehiculos
      .filter((v) => v.estado === "vendido")
      .forEach((v) => {
        const g = ganancia(v) || 0;
        (v.participaciones || []).forEach((p) => {
          if (map[p.socioId] === undefined) return;
          map[p.socioId] += g * ((Number(p.porcentaje) || 0) / 100);
        });
      });
    return map;
  }, [socios, vehiculos]);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cargando datos…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Socios"
        desc="Quiénes integran la sociedad y su resultado acumulado."
        action={
          <button className="btn-primary" onClick={() => setModal({ type: "nuevo-socio" })}>
            <Plus size={16} /> Nuevo socio
          </button>
        }
      />

      {socios.length === 0 ? (
        <EmptyState
          title="Todavía no cargaste socios"
          desc="Agregá a cada integrante de la sociedad para poder asignarles un porcentaje de participación en cada compra."
          action={
            <button className="btn-primary" onClick={() => setModal({ type: "nuevo-socio" })}>
              <Plus size={16} /> Agregar socio
            </button>
          }
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 14 }}>
          {socios.map((s) => {
            const vehiculosParticipa = vehiculos.filter((v) => (v.participaciones || []).some((p) => p.socioId === s.id));
            const g = gananciaPorSocio[s.id] || 0;
            return (
              <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 36, height: 36, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", color: "#1A1305", fontWeight: 700 }}>
                      {s.nombre.slice(0, 1).toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15.5 }}>{s.nombre}</span>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      if (confirm("¿Eliminar este socio? Se quitará de todas las participaciones registradas.")) deleteSocio(s.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Ganancia acumulada</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: g >= 0 ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
                  {money(g)}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{vehiculosParticipa.length} vehículo(s) con participación</div>
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === "nuevo-socio" && (
        <FormSocio
          onClose={() => setModal(null)}
          onSave={async (n) => {
            await addSocio(n);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
