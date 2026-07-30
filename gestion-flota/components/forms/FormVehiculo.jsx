"use client";
import { useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Modal, Field, Input, Select } from "../ui";
import { MarcaModeloFields } from "../MarcaModeloFields";
import { CONDICIONES, DOCUMENTACIONES, pctSum } from "@/lib/derived";

export function FormVehiculo({ socios, onClose, onSave, onNecesitaSocio }) {
  const [f, setF] = useState({
    marca: "",
    modelo: "",
    anio: "",
    patente: "",
    kilometraje: "",
    condicion: CONDICIONES[1],
    documentacion: DOCUMENTACIONES[0],
    notasDocumentacion: "",
    fechaCompra: new Date().toISOString().slice(0, 10),
    precioCompra: "",
    vendedor: "",
  });
  const [participaciones, setParticipaciones] = useState(
    socios.length ? socios.map((s) => ({ socioId: s.id, porcentaje: Math.round(100 / socios.length) })) : []
  );
  const [saving, setSaving] = useState(false);

  const total = pctSum(participaciones);

  function setPct(socioId, val) {
    setParticipaciones((prev) => prev.map((p) => (p.socioId === socioId ? { ...p, porcentaje: val } : p)));
  }

  async function submit(e) {
    e.preventDefault();
    if (!f.marca || !f.precioCompra || saving) return;
    setSaving(true);
    await onSave({ ...f, participaciones: participaciones.filter((p) => Number(p.porcentaje) > 0) });
  }

  return (
    <Modal title="Cargar vehículo comprado" onClose={onClose} width={620}>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <MarcaModeloFields marca={f.marca} modelo={f.modelo} onChange={(patch) => setF({ ...f, ...patch })} />
          <Field label="Año"><Input type="number" value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })} placeholder="2018" /></Field>
          <Field label="Patente / Dominio"><Input value={f.patente} onChange={(e) => setF({ ...f, patente: e.target.value.toUpperCase() })} placeholder="AB123CD" /></Field>
          <Field label="Fecha de compra"><Input type="date" value={f.fechaCompra} onChange={(e) => setF({ ...f, fechaCompra: e.target.value })} /></Field>
          <Field label="Precio de compra (USD)"><Input required type="number" min="0" value={f.precioCompra} onChange={(e) => setF({ ...f, precioCompra: e.target.value })} placeholder="8000" /></Field>
          <Field label="Kilometraje"><Input type="number" min="0" value={f.kilometraje} onChange={(e) => setF({ ...f, kilometraje: e.target.value })} placeholder="Ej: 85000" /></Field>
          <Field label="Condición">
            <Select value={f.condicion} onChange={(e) => setF({ ...f, condicion: e.target.value })}>
              {CONDICIONES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Documentación">
            <Select value={f.documentacion} onChange={(e) => setF({ ...f, documentacion: e.target.value })}>
              {DOCUMENTACIONES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Comprado a (opcional)"><Input value={f.vendedor} onChange={(e) => setF({ ...f, vendedor: e.target.value })} placeholder="Nombre del vendedor" /></Field>
        </div>
        <Field label="Notas de documentación (opcional)">
          <Input value={f.notasDocumentacion} onChange={(e) => setF({ ...f, notasDocumentacion: e.target.value })} placeholder="Ej: falta cédula verde, deuda de patentes, etc." />
        </Field>

        <div style={{ marginTop: 6, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.03em" }}>PARTICIPACIÓN POR SOCIO</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: total === 100 ? "var(--green)" : "var(--amber)" }}>{total}% asignado</span>
        </div>

        {socios.length === 0 ? (
          <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 14, fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
            Todavía no hay socios cargados.{" "}
            <button type="button" onClick={onNecesitaSocio} style={{ color: "var(--amber)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Agregar un socio primero
            </button>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
            {socios.map((s, i) => {
              const p = participaciones.find((x) => x.socioId === s.id) || { porcentaje: 0 };
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color }} />
                    {s.nombre}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Input type="number" min="0" max="100" value={p.porcentaje} onChange={(e) => setPct(s.id, e.target.value)} style={{ width: 70, textAlign: "right" }} />
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {total !== 100 && socios.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--amber)", fontSize: 12.5, marginBottom: 10 }}>
            <AlertTriangle size={14} /> Podés guardar igual, pero lo ideal es que sume 100%.
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
          <Sparkles size={15} /> {saving ? "Guardando…" : "Guardar vehículo"}
        </button>
      </form>
    </Modal>
  );
}
