"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useFleetData } from "@/lib/FleetDataContext";
import { PageHeader, EmptyState } from "../ui";
import { VehiculoTable } from "../VehiculoTable";
import { FormVehiculo } from "../forms/FormVehiculo";
import { FormSocio } from "../forms/FormSocio";
import { ESTADOS } from "@/lib/derived";

export function VehiculosListView() {
  const { socios, vehiculos, loading, addVehiculo, addSocio } = useFleetData();
  const router = useRouter();
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(null);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cargando datos…</div>;
  }

  const filtrados = vehiculos.filter((v) =>
    filtro === "todos" ? true : filtro === "stock" ? v.estado === ESTADOS.STOCK : v.estado === ESTADOS.VENDIDO
  );

  return (
    <div>
      <PageHeader
        title="Vehículos"
        desc="Compras, gastos y ventas de cada unidad de la flota."
        action={
          <button className="btn-primary" onClick={() => setModal({ type: "nuevo-vehiculo" })}>
            <Plus size={16} /> Nuevo vehículo
          </button>
        }
      />

      {vehiculos.length === 0 ? (
        <EmptyState
          title="No hay vehículos cargados todavía"
          desc="Registrá la primera compra: marca, modelo, precio y qué porcentaje aportó cada socio."
          action={
            <button className="btn-primary" onClick={() => setModal({ type: "nuevo-vehiculo" })}>
              <Plus size={16} /> Cargar primer vehículo
            </button>
          }
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              ["todos", "Todos"],
              ["stock", "En stock"],
              ["vendidos", "Vendidos"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFiltro(id)}
                className="btn-ghost"
                style={{
                  background: filtro === id ? "var(--surface-2)" : "transparent",
                  borderColor: filtro === id ? "var(--amber)" : "var(--border)",
                  color: filtro === id ? "var(--text)" : "var(--text-muted)",
                  padding: "7px 14px",
                  fontSize: 13,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <VehiculoTable vehiculos={filtrados} onAbrir={(id) => router.push(`/vehiculos/${id}`)} />
        </>
      )}

      {modal?.type === "nuevo-vehiculo" && (
        <FormVehiculo
          socios={socios}
          onClose={() => setModal(null)}
          onSave={async (v) => {
            await addVehiculo(v);
            setModal(null);
          }}
          onNecesitaSocio={() => setModal({ type: "nuevo-socio" })}
        />
      )}

      {modal?.type === "nuevo-socio" && (
        <FormSocio
          onClose={() => setModal(null)}
          onSave={async (n) => {
            await addSocio(n);
            setModal({ type: "nuevo-vehiculo" });
          }}
        />
      )}
    </div>
  );
}
