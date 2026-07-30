"use client";
import { useState } from "react";
import { Modal, Field, Input, Select } from "../ui";
import { MarcaModeloFields } from "../MarcaModeloFields";
import { CONDICIONES, DOCUMENTACIONES } from "@/lib/derived";

export function FormEditarVehiculo({ vehiculo, onClose, onSave }) {
  const [f, setF] = useState(
    vehiculo
      ? {
          marca: vehiculo.marca || "",
          modelo: vehiculo.modelo || "",
          anio: vehiculo.anio || "",
          patente: vehiculo.patente || "",
          kilometraje: vehiculo.kilometraje || "",
          condicion: vehiculo.condicion || CONDICIONES[1],
          documentacion: vehiculo.documentacion || DOCUMENTACIONES[0],
          notasDocumentacion: vehiculo.notasDocumentacion || "",
          vendedor: vehiculo.vendedor || "",
        }
      : {}
  );
  const [saving, setSaving] = useState(false);
  if (!vehiculo) return null;

  return (
    <Modal title={`Editar ficha · ${vehiculo.marca} ${vehiculo.modelo}`} onClose={onClose} width={620}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          await onSave(f);
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <MarcaModeloFields marca={f.marca} modelo={f.modelo} onChange={(patch) => setF({ ...f, ...patch })} />
          <Field label="Año"><Input type="number" value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })} /></Field>
          <Field label="Patente / Dominio"><Input value={f.patente} onChange={(e) => setF({ ...f, patente: e.target.value.toUpperCase() })} /></Field>
          <Field label="Kilometraje"><Input type="number" min="0" value={f.kilometraje} onChange={(e) => setF({ ...f, kilometraje: e.target.value })} /></Field>
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
          <Field label="Comprado a (opcional)"><Input value={f.vendedor} onChange={(e) => setF({ ...f, vendedor: e.target.value })} /></Field>
        </div>
        <Field label="Notas de documentación (opcional)">
          <Input value={f.notasDocumentacion} onChange={(e) => setF({ ...f, notasDocumentacion: e.target.value })} />
        </Field>
        <button className="btn-primary" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </Modal>
  );
}
