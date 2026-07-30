"use client";
import { useState } from "react";
import { Modal, Field, Input } from "../ui";

export function FormSocio({ onClose, onSave }) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal title="Nuevo socio" onClose={onClose} width={420}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nombre.trim() || saving) return;
          setSaving(true);
          await onSave(nombre.trim());
        }}
      >
        <Field label="Nombre del socio">
          <Input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Martín Gómez" />
        </Field>
        <button className="btn-primary" type="submit" disabled={saving} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          {saving ? "Guardando…" : "Guardar socio"}
        </button>
      </form>
    </Modal>
  );
}
