"use client";
import { useState } from "react";
import { Modal, Field, Input } from "../ui";
import { costoTotal, money } from "@/lib/derived";

export function FormVenta({ vehiculo, onClose, onSave }) {
  const [f, setF] = useState({ fechaVenta: new Date().toISOString().slice(0, 10), precioVenta: "", comprador: "" });
  const [saving, setSaving] = useState(false);
  if (!vehiculo) return null;
  const costo = costoTotal(vehiculo);
  const proyectado = f.precioVenta ? Number(f.precioVenta) - costo : null;

  return (
    <Modal title={`Registrar venta · ${vehiculo.marca} ${vehiculo.modelo}`} onClose={onClose} width={460}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.precioVenta || saving) return;
          setSaving(true);
          await onSave(f);
        }}
      >
        <Field label="Fecha de venta"><Input type="date" value={f.fechaVenta} onChange={(e) => setF({ ...f, fechaVenta: e.target.value })} /></Field>
        <Field label="Precio de venta (USD)"><Input required type="number" min="0" value={f.precioVenta} onChange={(e) => setF({ ...f, precioVenta: e.target.value })} placeholder="9500" /></Field>
        <Field label="Comprador (opcional)"><Input value={f.comprador} onChange={(e) => setF({ ...f, comprador: e.target.value })} placeholder="Nombre del comprador" /></Field>

        <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-muted)" }}>Costo total (compra + gastos)</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{money(costo)}</span>
        </div>
        {proyectado != null && (
          <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Resultado estimado</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: proyectado >= 0 ? "var(--green)" : "var(--red)" }}>{money(proyectado)}</span>
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
          {saving ? "Guardando…" : "Confirmar venta"}
        </button>
      </form>
    </Modal>
  );
}
