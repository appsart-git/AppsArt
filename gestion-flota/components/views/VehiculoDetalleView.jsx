"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  DollarSign,
  FileCheck2,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Route,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useFleetData } from "@/lib/FleetDataContext";
import { Badge, Plate, StatCard, SectionTitle, Input, Select } from "../ui";
import { FormEditarVehiculo } from "../forms/FormEditarVehiculo";
import { FormVenta } from "../forms/FormVenta";
import { ESTADOS, TIPO_GASTO, costoTotal, fmtDate, ganancia, money, pctSum, sumGastos } from "@/lib/derived";

export function VehiculoDetalleView({ id }) {
  const { socios, vehiculos, loading, addGasto, deleteGasto, uploadFoto, deleteFoto, updateVehiculo, registrarVenta, reabrirVenta, deleteVehiculo } =
    useFleetData();
  const router = useRouter();
  const [modal, setModal] = useState(null);
  const [gForm, setGForm] = useState({ tipo: TIPO_GASTO[0], monto: "", fecha: new Date().toISOString().slice(0, 10), descripcion: "" });
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef(null);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cargando datos…</div>;
  }

  const vehiculo = vehiculos.find((v) => v.id === id);
  if (!vehiculo) {
    return (
      <div>
        <button className="btn-ghost" onClick={() => router.push("/vehiculos")} style={{ marginBottom: 18 }}>
          ← Volver a vehículos
        </button>
        <div style={{ color: "var(--text-muted)" }}>No se encontró este vehículo.</div>
      </div>
    );
  }

  const g = ganancia(vehiculo);
  const costo = costoTotal(vehiculo);
  const gastos = sumGastos(vehiculo);

  function socioName(sid) {
    return socios.find((s) => s.id === sid)?.nombre || "Socio eliminado";
  }
  function socioColor(sid) {
    return socios.find((s) => s.id === sid)?.color || "var(--text-muted)";
  }

  async function submitGasto(e) {
    e.preventDefault();
    if (!gForm.monto) return;
    await addGasto(vehiculo.id, { ...gForm, monto: Number(gForm.monto) });
    setGForm({ tipo: TIPO_GASTO[0], monto: "", fecha: new Date().toISOString().slice(0, 10), descripcion: "" });
  }

  async function onFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendoFoto(true);
    try {
      await uploadFoto(vehiculo.id, file);
    } finally {
      setSubiendoFoto(false);
    }
  }

  return (
    <div>
      <button className="btn-ghost" onClick={() => router.push("/vehiculos")} style={{ marginBottom: 18 }}>
        ← Volver a vehículos
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: 0 }}>{vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio}</h1>
            <Badge tone={vehiculo.estado === ESTADOS.VENDIDO ? "vendido" : "stock"}>{vehiculo.estado === ESTADOS.VENDIDO ? "Vendido" : "En stock"}</Badge>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Plate>{vehiculo.patente || "S/D"}</Plate>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Comprado el {fmtDate(vehiculo.fechaCompra)}{vehiculo.vendedor ? ` a ${vehiculo.vendedor}` : ""}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
              <Route size={14} /> {vehiculo.kilometraje ? `${Number(vehiculo.kilometraje).toLocaleString("es-AR")} km` : "Km no cargado"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
              <Sparkles size={14} /> {vehiculo.condicion || "Condición no cargada"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
              <FileCheck2 size={14} /> Documentación: {vehiculo.documentacion || "S/D"}
              {vehiculo.notasDocumentacion ? ` · ${vehiculo.notasDocumentacion}` : ""}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={() => setModal({ type: "editar" })}><Pencil size={15} /> Editar ficha</button>
          {vehiculo.estado === ESTADOS.STOCK ? (
            <button className="btn-primary" onClick={() => setModal({ type: "vender" })}><DollarSign size={16} /> Registrar venta</button>
          ) : (
            <button className="btn-ghost" onClick={() => reabrirVenta(vehiculo.id)}>Deshacer venta</button>
          )}
          <button
            className="btn-danger"
            onClick={async () => {
              if (confirm(`¿Eliminar ${vehiculo.marca} ${vehiculo.modelo}? Esta acción no se puede deshacer.`)) {
                await deleteVehiculo(vehiculo.id);
                router.push("/vehiculos");
              }
            }}
          >
            <Trash2 size={15} /> Eliminar
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard icon={DollarSign} label="Precio de compra" value={money(vehiculo.precioCompra)} tone="amber" />
        <StatCard icon={Wrench} label="Gastos" value={money(gastos)} tone="red" />
        <StatCard icon={Car} label="Costo total" value={money(costo)} tone="amber" />
        {vehiculo.estado === ESTADOS.VENDIDO && (
          <>
            <StatCard icon={DollarSign} label="Precio de venta" value={money(vehiculo.precioVenta)} tone="green" />
            <StatCard icon={g >= 0 ? TrendingUp : TrendingDown} label="Ganancia (venta − compra − gastos)" value={money(g)} tone={g >= 0 ? "green" : "red"} />
          </>
        )}
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Fotos</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelected} style={{ display: "none" }} />
          <button type="button" className="btn-ghost" disabled={subiendoFoto} onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={15} /> {subiendoFoto ? "Subiendo…" : "Subir foto"}
          </button>
        </div>
        {(vehiculo.fotos || []).length === 0 ? (
          <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 20, color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <ImageIcon size={16} /> Todavía no hay fotos cargadas para este vehículo.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {vehiculo.fotos.map((f) => (
              <div key={f.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "4/3", background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button
                  className="icon-btn"
                  onClick={() => deleteFoto(f.id, f.storagePath)}
                  style={{ position: "absolute", top: 4, right: 4, background: "rgba(10,12,14,0.65)", color: "#fff" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <SectionTitle>Participación de socios</SectionTitle>
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {(vehiculo.participaciones || []).map((p, i) => (
              <div key={p.socioId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: socioColor(p.socioId) }} />
                  <span style={{ fontSize: 14 }}>{socioName(p.socioId)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>{p.porcentaje}%</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 600 }}>
                    {vehiculo.estado === ESTADOS.VENDIDO ? money((g || 0) * (p.porcentaje / 100)) : money(costo * (p.porcentaje / 100)) + " aportados"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {pctSum(vehiculo.participaciones) !== 100 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--amber)", fontSize: 12.5, marginTop: 8 }}>
              <AlertTriangle size={14} /> Las participaciones suman {pctSum(vehiculo.participaciones)}%, no 100%.
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Gastos del vehículo</SectionTitle>
          <form onSubmit={submitGasto} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Select value={gForm.tipo} onChange={(e) => setGForm({ ...gForm, tipo: e.target.value })}>
                {TIPO_GASTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input type="number" min="0" placeholder="Monto USD" value={gForm.monto} onChange={(e) => setGForm({ ...gForm, monto: e.target.value })} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 10 }}>
              <Input type="date" value={gForm.fecha} onChange={(e) => setGForm({ ...gForm, fecha: e.target.value })} />
              <Input placeholder="Descripción (opcional)" value={gForm.descripcion} onChange={(e) => setGForm({ ...gForm, descripcion: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Agregar gasto
            </button>
          </form>

          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {(vehiculo.gastos || []).length === 0 ? (
              <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}>Sin gastos registrados todavía.</div>
            ) : (
              [...vehiculo.gastos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).map((g2, i) => (
                <div key={g2.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{g2.tipo}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDate(g2.fecha)}{g2.descripcion ? ` · ${g2.descripcion}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, color: "var(--red)" }}>{money(g2.monto)}</span>
                    <button className="icon-btn" onClick={() => deleteGasto(g2.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {vehiculo.estado === ESTADOS.VENDIDO && (
        <div style={{ marginTop: 24, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={14} /> Vendido el {fmtDate(vehiculo.fechaVenta)}{vehiculo.comprador ? ` a ${vehiculo.comprador}` : ""}.
        </div>
      )}

      {modal?.type === "editar" && (
        <FormEditarVehiculo
          vehiculo={vehiculo}
          onClose={() => setModal(null)}
          onSave={async (patch) => {
            await updateVehiculo(vehiculo.id, patch);
            setModal(null);
          }}
        />
      )}

      {modal?.type === "vender" && (
        <FormVenta
          vehiculo={vehiculo}
          onClose={() => setModal(null)}
          onSave={async (venta) => {
            await registrarVenta(vehiculo.id, venta);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
