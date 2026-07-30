"use client";
import { useState } from "react";
import { Field, Input, Select } from "./ui";
import { CATALOGO_ARG, MARCAS_ORDENADAS } from "@/lib/catalogoArg";

export function MarcaModeloFields({ marca, modelo, onChange }) {
  const [otraMarca, setOtraMarca] = useState(!!marca && !CATALOGO_ARG[marca]);
  const modelosDisponibles = CATALOGO_ARG[marca] || [];
  const [otroModelo, setOtroModelo] = useState(!!modelo && !modelosDisponibles.includes(modelo));

  function handleMarcaSelect(val) {
    if (val === "__otra__") {
      setOtraMarca(true);
      setOtroModelo(true);
      onChange({ marca: "", modelo: "" });
    } else {
      setOtraMarca(false);
      setOtroModelo(false);
      onChange({ marca: val, modelo: "" });
    }
  }

  function handleModeloSelect(val) {
    if (val === "__otro__") {
      setOtroModelo(true);
      onChange({ modelo: "" });
    } else {
      onChange({ modelo: val });
    }
  }

  return (
    <>
      <Field label="Marca">
        {otraMarca ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Input autoFocus value={marca} onChange={(e) => onChange({ marca: e.target.value })} placeholder="Escribí la marca" />
            <button type="button" className="btn-ghost" style={{ padding: "0 10px" }} onClick={() => { setOtraMarca(false); onChange({ marca: "", modelo: "" }); }}>
              Lista
            </button>
          </div>
        ) : (
          <Select value={marca} onChange={(e) => handleMarcaSelect(e.target.value)} required>
            <option value="">Seleccionar marca</option>
            {MARCAS_ORDENADAS.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__otra__">Otra marca…</option>
          </Select>
        )}
      </Field>
      <Field label="Modelo">
        {otraMarca || otroModelo ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Input value={modelo} onChange={(e) => onChange({ modelo: e.target.value })} placeholder="Escribí el modelo" />
            {!otraMarca && (
              <button type="button" className="btn-ghost" style={{ padding: "0 10px" }} onClick={() => { setOtroModelo(false); onChange({ modelo: "" }); }}>
                Lista
              </button>
            )}
          </div>
        ) : (
          <Select value={modelo} onChange={(e) => handleModeloSelect(e.target.value)} disabled={!marca}>
            <option value="">{marca ? "Seleccionar modelo" : "Elegí primero la marca"}</option>
            {modelosDisponibles.map((m) => <option key={m} value={m}>{m}</option>)}
            {marca && <option value="__otro__">Otro modelo…</option>}
          </Select>
        )}
      </Field>
    </>
  );
}
