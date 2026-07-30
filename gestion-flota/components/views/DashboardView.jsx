"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, TrendingUp, TrendingDown, Wrench } from "lucide-react";
import { useFleetData } from "@/lib/FleetDataContext";
import { StatCard, PageHeader, SectionTitle, EmptyState } from "../ui";
import { VehiculoTable } from "../VehiculoTable";
import { ESTADOS, costoTotal, ganancia, money, sumGastos } from "@/lib/derived";

export function DashboardView() {
  const { socios, vehiculos, loading } = useFleetData();
  const router = useRouter();

  const stock = vehiculos.filter((v) => v.estado === ESTADOS.STOCK);
  const vendidos = vehiculos.filter((v) => v.estado === ESTADOS.VENDIDO);
  const invertidoEnStock = stock.reduce((a, v) => a + costoTotal(v), 0);
  const gananciaTotal = vendidos.reduce((a, v) => a + (ganancia(v) || 0), 0);
  const gastosTotales = vehiculos.reduce((a, v) => a + sumGastos(v), 0);

  const gananciaPorSocio = useMemo(() => {
    const map = {};
    socios.forEach((s) => (map[s.id] = 0));
    vendidos.forEach((v) => {
      const g = ganancia(v) || 0;
      (v.participaciones || []).forEach((p) => {
        if (map[p.socioId] === undefined) return;
        map[p.socioId] += g * ((Number(p.porcentaje) || 0) / 100);
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socios, vendidos]);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cargando datos…</div>;
  }

  if (vehiculos.length === 0) {
    return (
      <div>
        <PageHeader title="Panel general" desc="Estado actual de la flota y resultado acumulado de la sociedad." />
        <EmptyState
          title="Todavía no hay vehículos cargados"
          desc="Agregá el primer auto desde la sección Vehículos para empezar a llevar el control de compras, gastos y ventas."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Panel general" desc="Estado actual de la flota y resultado acumulado de la sociedad." />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard icon={Car} label="En stock" value={stock.length} tone="amber" sub={money(invertidoEnStock) + " invertidos"} />
        <StatCard icon={CheckCircle2} label="Vendidos" value={vendidos.length} tone="green" />
        <StatCard
          icon={gananciaTotal >= 0 ? TrendingUp : TrendingDown}
          label="Ganancia acumulada"
          value={money(gananciaTotal)}
          tone={gananciaTotal >= 0 ? "green" : "red"}
        />
        <StatCard icon={Wrench} label="Gastos totales" value={money(gastosTotales)} tone="red" sub="reparaciones, limpieza y otros" />
      </div>

      {socios.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionTitle>Ganancia por socio</SectionTitle>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {socios.map((s) => {
              const g = gananciaPorSocio[s.id] || 0;
              return (
                <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", minWidth: 170 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.nombre}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 700, color: g >= 0 ? "var(--green)" : "var(--red)" }}>
                    {money(g)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stock.length > 0 && (
        <div>
          <SectionTitle>Vehículos en stock</SectionTitle>
          <VehiculoTable vehiculos={stock} onAbrir={(id) => router.push(`/vehiculos/${id}`)} />
        </div>
      )}
    </div>
  );
}
