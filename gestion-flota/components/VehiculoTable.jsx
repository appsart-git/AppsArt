"use client";
import { ChevronRight } from "lucide-react";
import { Badge, Plate } from "./ui";
import { ESTADOS, costoTotal, fmtDate, ganancia, money } from "@/lib/derived";

export function VehiculoTable({ vehiculos, onAbrir }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <table>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            {["Vehículo", "Patente", "Km", "Compra", "Costo total", "Estado", "Ganancia", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehiculos.map((v) => {
            const g = ganancia(v);
            return (
              <tr key={v.id} className="row-hover" style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }} onClick={() => onAbrir(v.id)}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{v.marca} {v.modelo}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{v.anio}</div>
                </td>
                <td style={{ padding: "12px 14px" }}><Plate>{v.patente || "S/D"}</Plate></td>
                <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 13 }}>{v.kilometraje ? `${Number(v.kilometraje).toLocaleString("es-AR")} km` : "—"}</td>
                <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 13 }}>{fmtDate(v.fechaCompra)}</td>
                <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 13 }}>{money(costoTotal(v))}</td>
                <td style={{ padding: "12px 14px" }}>
                  <Badge tone={v.estado === ESTADOS.VENDIDO ? "vendido" : "stock"}>{v.estado === ESTADOS.VENDIDO ? "Vendido" : "En stock"}</Badge>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 13, color: g == null ? "var(--text-muted)" : g >= 0 ? "var(--green)" : "var(--red)" }}>
                  {g == null ? "—" : money(g)}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
