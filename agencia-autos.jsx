import { useState, useEffect, useMemo } from "react";
import {
  Car,
  Users,
  Wrench,
  Plus,
  X,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  ChevronRight,
  Route,
  FileCheck2,
  Image as ImageIcon,
  ImagePlus,
} from "lucide-react";

const STORAGE_KEY = "agencia-autos-data-v1";
const SHARED = true; // datos visibles para todos los socios que abran la app

const ESTADOS = {
  STOCK: "en_stock",
  VENDIDO: "vendido",
};

const TIPO_GASTO = ["Reparación mecánica", "Acondicionamiento / Limpieza", "Documentación / Trámites", "Repuestos", "Otro"];

const CONDICIONES = ["Excelente", "Muy buena", "Buena", "Regular", "Para repuestos"];

const DOCUMENTACIONES = ["Al día", "En trámite", "Con observaciones"];

// Marcas y modelos habitualmente comercializados (0km y usados) en Argentina.
const CATALOGO_ARG = {
  "Toyota": ["Corolla", "Corolla Cross", "Etios", "Yaris", "Hilux", "SW4", "RAV4", "Camry", "Prius"],
  "Volkswagen": ["Gol", "Voyage", "Polo", "Virtus", "Vento", "Suran", "Amarok", "Taos", "Nivus", "Fox", "Up!", "Saveiro"],
  "Chevrolet": ["Corsa", "Classic", "Celta", "Onix", "Onix Plus", "Prisma", "Cruze", "Tracker", "S10", "Spin", "Agile", "Astra"],
  "Ford": ["Fiesta", "Focus", "Ka", "EcoSport", "Ranger", "Territory", "Mondeo", "Escort", "F-100"],
  "Fiat": ["Palio", "Siena", "Uno", "Punto", "Cronos", "Argo", "Mobi", "Toro", "Strada", "Idea", "Pulse", "Fiorino"],
  "Renault": ["Clio", "Sandero", "Logan", "Duster", "Kangoo", "Fluence", "Megane", "Captur", "Symbol", "Kwid", "Alaskan", "Oroch", "Stepway"],
  "Peugeot": ["208", "207", "206", "307", "308", "2008", "3008", "Partner", "408", "508"],
  "Citroën": ["C3", "C4 Cactus", "C4 Lounge", "Berlingo", "C4 Aircross", "Xsara", "C3 Aircross"],
  "Honda": ["Civic", "Fit", "HR-V", "City", "CR-V"],
  "Nissan": ["March", "Versa", "Sentra", "Kicks", "Frontier", "X-Trail"],
  "Hyundai": ["HB20", "Creta", "Tucson", "i10", "Accent", "Elantra", "Santa Fe"],
  "Kia": ["Rio", "Sportage", "Cerato", "Picanto", "Sorento", "Soul"],
  "Jeep": ["Renegade", "Compass", "Cherokee", "Grand Cherokee"],
  "RAM": ["1500", "700", "2500"],
  "Chery": ["Tiggo 2", "Tiggo 3", "Tiggo 7", "Tiggo 8", "Arauca", "QQ"],
  "DS": ["DS3", "DS4", "DS7"],
  "Suzuki": ["Fun", "Swift", "Ertiga", "Vitara"],
  "Mitsubishi": ["Lancer", "Outlander", "L200", "ASX"],
  "Subaru": ["Impreza", "Forester", "XV"],
  "Alfa Romeo": ["147", "Giulietta", "Stelvio"],
  "Audi": ["A3", "A4", "Q3", "Q5"],
  "BMW": ["Serie 1", "Serie 3", "X1", "X3"],
  "Mercedes-Benz": ["Clase A", "Clase C", "GLA", "Sprinter", "Vito"],
  "Volvo": ["XC40", "XC60", "S60"],
  "Land Rover": ["Discovery", "Range Rover Evoque", "Defender"],
  "Baic": ["X35", "X55"],
  "JAC": ["S2", "T40", "T60"],
  "Haval": ["H6", "Jolion"],
  "Daihatsu": ["Applause", "Terios"],
  "Isuzu": ["D-Max"],
};

const MARCAS_ORDENADAS = Object.keys(CATALOGO_ARG).sort((a, b) => a.localeCompare(b, "es"));

const PALETTE_SOCIOS = ["#E8A33D", "#4C8DFF", "#34B27B", "#E15252", "#C77DFF", "#5FD3C4"];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function sumGastos(v) {
  return (v.gastos || []).reduce((a, g) => a + (Number(g.monto) || 0), 0);
}

function costoTotal(v) {
  return (Number(v.precioCompra) || 0) + sumGastos(v);
}

function ganancia(v) {
  if (v.estado !== ESTADOS.VENDIDO) return null;
  return (Number(v.precioVenta) || 0) - costoTotal(v);
}

function pctSum(participaciones) {
  return (participaciones || []).reduce((a, p) => a + (Number(p.porcentaje) || 0), 0);
}

// ---------- almacenamiento ----------
async function loadData() {
  try {
    const res = await window.storage.get(STORAGE_KEY, SHARED);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* clave inexistente todavía */
  }
  return { socios: [], vehiculos: [] };
}

async function saveData(data) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(data), SHARED);
  } catch (e) {
    console.error("No se pudo guardar", e);
  }
}

// ---------- UI helpers ----------
function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "var(--surface-2)", color: "var(--text-muted)", border: "var(--border)" },
    stock: { bg: "rgba(232,163,61,0.12)", color: "var(--amber)", border: "rgba(232,163,61,0.4)" },
    vendido: { bg: "rgba(52,178,123,0.12)", color: "var(--green)", border: "rgba(52,178,123,0.4)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
        padding: "3px 9px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Plate({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.08em",
        background: "linear-gradient(180deg,#f2f2f2,#dcdcdc)",
        color: "#15181b",
        border: "2px solid #9a9a9a",
        borderRadius: 5,
        padding: "3px 10px",
        position: "relative",
      }}
    >
      <span style={{ position: "absolute", top: 2, left: 3, width: 3, height: 3, borderRadius: "50%", background: "#8a8a8a" }} />
      <span style={{ position: "absolute", top: 2, right: 3, width: 3, height: 3, borderRadius: "50%", background: "#8a8a8a" }} />
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,10,12,0.72)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px",
        zIndex: 50,
        overflowY: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          width: "100%",
          maxWidth: width,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, letterSpacing: "0.02em", color: "var(--text)" }}>
            {title}
          </h3>
          <button onClick={onClose} className="icon-btn">
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.03em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "9px 11px",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  outline: "none",
  boxSizing: "border-box",
};

function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function Select(props) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>
      {props.children}
    </select>
  );
}

function MarcaModeloFields({ marca, modelo, onChange }) {
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

// ---------- App ----------
export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null); // {type, payload}
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData().then((d) => setData(d));
  }, []);

  useEffect(() => {
    if (!data) return;
    setSaving(true);
    const t = setTimeout(() => {
      saveData(data).finally(() => setSaving(false));
    }, 300);
    return () => clearTimeout(t);
  }, [data]);

  const socios = data ? data.socios : [];
  const vehiculos = data ? data.vehiculos : [];

  // Todos los hooks deben ejecutarse siempre en el mismo orden,
  // así que este cálculo va antes del "return" temprano de abajo.
  const vendidosParaCalculo = vehiculos.filter((v) => v.estado === ESTADOS.VENDIDO);
  const gananciaPorSocio = useMemo(() => {
    const map = {};
    socios.forEach((s) => (map[s.id] = 0));
    vendidosParaCalculo.forEach((v) => {
      const g = ganancia(v) || 0;
      (v.participaciones || []).forEach((p) => {
        if (map[p.socioId] === undefined) return;
        map[p.socioId] += g * ((Number(p.porcentaje) || 0) / 100);
      });
    });
    return map;
  }, [socios, vendidosParaCalculo]);

  if (!data) {
    return (
      <Shell tab={tab} setTab={setTab} data={{ socios: [], vehiculos: [] }}>
        <div style={{ padding: 40, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Cargando datos…</div>
      </Shell>
    );
  }

  function updateData(fn) {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  // ---- acciones socios ----
  function addSocio(nombre) {
    updateData((d) => {
      d.socios.push({ id: uid(), nombre, color: PALETTE_SOCIOS[d.socios.length % PALETTE_SOCIOS.length] });
    });
  }
  function deleteSocio(id) {
    updateData((d) => {
      d.socios = d.socios.filter((s) => s.id !== id);
      d.vehiculos.forEach((v) => {
        v.participaciones = (v.participaciones || []).filter((p) => p.socioId !== id);
      });
    });
  }

  // ---- acciones vehiculos ----
  function addVehiculo(v) {
    updateData((d) => {
      d.vehiculos.unshift({
        id: uid(),
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
        patente: v.patente,
        kilometraje: v.kilometraje,
        condicion: v.condicion,
        documentacion: v.documentacion,
        notasDocumentacion: v.notasDocumentacion,
        fechaCompra: v.fechaCompra,
        precioCompra: v.precioCompra,
        vendedor: v.vendedor,
        estado: ESTADOS.STOCK,
        fechaVenta: "",
        precioVenta: "",
        comprador: "",
        participaciones: v.participaciones,
        gastos: [],
        fotos: [],
      });
    });
  }

  function updateVehiculo(id, patch) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === id);
      Object.assign(v, patch);
    });
  }

  function deleteVehiculo(id) {
    updateData((d) => {
      d.vehiculos = d.vehiculos.filter((v) => v.id !== id);
    });
    setSelectedVehiculo(null);
  }

  function addFoto(vehiculoId, url) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === vehiculoId);
      v.fotos = v.fotos || [];
      v.fotos.push({ id: uid(), url });
    });
  }
  function deleteFoto(vehiculoId, fotoId) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === vehiculoId);
      v.fotos = (v.fotos || []).filter((f) => f.id !== fotoId);
    });
  }

  function addGasto(vehiculoId, gasto) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === vehiculoId);
      v.gastos = v.gastos || [];
      v.gastos.push({ id: uid(), ...gasto });
    });
  }
  function deleteGasto(vehiculoId, gastoId) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === vehiculoId);
      v.gastos = v.gastos.filter((g) => g.id !== gastoId);
    });
  }

  function registrarVenta(vehiculoId, venta) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === vehiculoId);
      v.estado = ESTADOS.VENDIDO;
      v.fechaVenta = venta.fechaVenta;
      v.precioVenta = venta.precioVenta;
      v.comprador = venta.comprador;
    });
  }

  function reabrirVenta(vehiculoId) {
    updateData((d) => {
      const v = d.vehiculos.find((x) => x.id === vehiculoId);
      v.estado = ESTADOS.STOCK;
    });
  }

  // ---- métricas ----
  const stock = vehiculos.filter((v) => v.estado === ESTADOS.STOCK);
  const vendidos = vehiculos.filter((v) => v.estado === ESTADOS.VENDIDO);
  const invertidoEnStock = stock.reduce((a, v) => a + costoTotal(v), 0);
  const gananciaTotal = vendidos.reduce((a, v) => a + (ganancia(v) || 0), 0);
  const gastosTotales = vehiculos.reduce((a, v) => a + sumGastos(v), 0);

  const selected = selectedVehiculo ? vehiculos.find((v) => v.id === selectedVehiculo) : null;

  return (
    <Shell tab={tab} setTab={setTab} data={data} saving={saving}>
      {tab === "dashboard" && (
        <Dashboard
          socios={socios}
          stock={stock}
          vendidos={vendidos}
          invertidoEnStock={invertidoEnStock}
          gananciaTotal={gananciaTotal}
          gastosTotales={gastosTotales}
          gananciaPorSocio={gananciaPorSocio}
          onVerVehiculo={(id) => {
            setSelectedVehiculo(id);
            setTab("vehiculos");
          }}
          vehiculos={vehiculos}
        />
      )}

      {tab === "vehiculos" && !selected && (
        <ListaVehiculos
          vehiculos={vehiculos}
          socios={socios}
          onNuevo={() => setModal({ type: "nuevo-vehiculo" })}
          onAbrir={(id) => setSelectedVehiculo(id)}
        />
      )}

      {tab === "vehiculos" && selected && (
        <DetalleVehiculo
          vehiculo={selected}
          socios={socios}
          onVolver={() => setSelectedVehiculo(null)}
          onAddGasto={(g) => addGasto(selected.id, g)}
          onDeleteGasto={(gid) => deleteGasto(selected.id, gid)}
          onAddFoto={(url) => addFoto(selected.id, url)}
          onDeleteFoto={(fid) => deleteFoto(selected.id, fid)}
          onVender={() => setModal({ type: "vender", payload: selected.id })}
          onReabrir={() => reabrirVenta(selected.id)}
          onEditar={() => setModal({ type: "editar-vehiculo", payload: selected.id })}
          onEliminar={() => {
            if (confirm(`¿Eliminar ${selected.marca} ${selected.modelo}? Esta acción no se puede deshacer.`)) {
              deleteVehiculo(selected.id);
            }
          }}
        />
      )}

      {tab === "socios" && (
        <ListaSocios
          socios={socios}
          vehiculos={vehiculos}
          gananciaPorSocio={gananciaPorSocio}
          onNuevo={() => setModal({ type: "nuevo-socio" })}
          onEliminar={(id) => {
            if (confirm("¿Eliminar este socio? Se quitará de todas las participaciones registradas.")) deleteSocio(id);
          }}
        />
      )}

      {/* ---- Modales ---- */}
      {modal?.type === "nuevo-socio" && (
        <FormSocio onClose={() => setModal(null)} onSave={(n) => { addSocio(n); setModal(null); }} />
      )}

      {modal?.type === "nuevo-vehiculo" && (
        <FormVehiculo
          socios={socios}
          onClose={() => setModal(null)}
          onSave={(v) => {
            addVehiculo(v);
            setModal(null);
          }}
          onNecesitaSocio={() => setModal({ type: "nuevo-socio" })}
        />
      )}

      {modal?.type === "editar-vehiculo" && (
        <FormEditarVehiculo
          vehiculo={vehiculos.find((v) => v.id === modal.payload)}
          onClose={() => setModal(null)}
          onSave={(patch) => {
            updateVehiculo(modal.payload, patch);
            setModal(null);
          }}
        />
      )}

      {modal?.type === "vender" && (
        <FormVenta
          vehiculo={vehiculos.find((v) => v.id === modal.payload)}
          onClose={() => setModal(null)}
          onSave={(venta) => {
            registrarVenta(modal.payload, venta);
            setModal(null);
          }}
        />
      )}
    </Shell>
  );
}

// ---------- Shell / layout ----------
function Shell({ tab, setTab, children, data, saving }) {
  const nav = [
    { id: "dashboard", label: "Panel", icon: Gauge },
    { id: "vehiculos", label: "Vehículos", icon: Car },
    { id: "socios", label: "Socios", icon: Users },
  ];
  return (
    <div
      style={{
        "--bg": "#14171A",
        "--surface": "#1D2126",
        "--surface-2": "#262B32",
        "--border": "#2E343C",
        "--text": "#ECEDEF",
        "--text-muted": "#8B92A0",
        "--amber": "#E8A33D",
        "--green": "#34B27B",
        "--red": "#E15252",
        "--font-display": "'Oswald', 'Arial Narrow', sans-serif",
        "--font-body": "'Inter', system-ui, sans-serif",
        "--font-mono": "'JetBrains Mono', 'Courier New', monospace",
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        fontFamily: "var(--font-body)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: #5C6470; }
        .icon-btn { background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s; }
        .icon-btn:hover { background:var(--surface-2); color:var(--text); }
        .btn-primary { background:var(--amber); color:#1A1305; border:none; font-weight:700; border-radius:6px; padding:10px 16px; font-size:13.5px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; letter-spacing:.01em; transition:filter .15s; }
        .btn-primary:hover { filter:brightness(1.08); }
        .btn-ghost { background:transparent; color:var(--text); border:1px solid var(--border); border-radius:6px; padding:9px 15px; font-size:13.5px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; }
        .btn-ghost:hover { background:var(--surface-2); }
        .btn-danger { background:transparent; color:var(--red); border:1px solid rgba(225,82,82,0.35); border-radius:6px; padding:9px 15px; font-size:13.5px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; }
        .btn-danger:hover { background:rgba(225,82,82,0.1); }
        .row-hover:hover { background: var(--surface-2); }
        table { border-collapse: collapse; width:100%; }
        a { color: inherit; }
      `}</style>

      <aside
        style={{
          width: 220,
          borderRight: "1px solid var(--border)",
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 7,
              background: "linear-gradient(135deg,var(--amber),#c97f1e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Car size={19} color="#1A1305" />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.03em", lineHeight: 1 }}>LOTE&nbsp;9</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Gestión de flota
            </div>
          </div>
        </div>

        {nav.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 7,
                border: "none",
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                textAlign: "left",
                borderLeft: active ? "3px solid var(--amber)" : "3px solid transparent",
              }}
            >
              <Icon size={17} />
              {n.label}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", padding: "12px 8px 0", fontSize: 11, color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: saving ? "var(--amber)" : "var(--green)",
                display: "inline-block",
              }}
            />
            {saving ? "Guardando…" : "Datos al día"}
          </div>
          <div style={{ marginTop: 4, opacity: 0.7 }}>Compartido entre todos los socios</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "28px 34px", minWidth: 0 }}>{children}</main>
    </div>
  );
}

// ---------- Dashboard ----------
function StatCard({ icon: Icon, label, value, tone, sub }) {
  const toneColor = tone === "green" ? "var(--green)" : tone === "red" ? "var(--red)" : "var(--amber)";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, flex: 1, minWidth: 190 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          {label}
        </span>
        <Icon size={16} color={toneColor} />
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 25, fontWeight: 700, color: toneColor }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ socios, stock, vendidos, invertidoEnStock, gananciaTotal, gastosTotales, gananciaPorSocio, onVerVehiculo, vehiculos }) {
  if (vehiculos.length === 0) {
    return <EmptyState title="Todavía no hay vehículos cargados" desc="Agregá el primer auto desde la sección Vehículos para empezar a llevar el control de compras, gastos y ventas." />;
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
          <VehiculoTable vehiculos={stock} onAbrir={onVerVehiculo} />
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 12px" }}>
      {children}
    </h3>
  );
}

function PageHeader({ title, desc, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: 0, letterSpacing: "0.01em" }}>{title}</h1>
        {desc && <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 14 }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, desc, action }) {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: "60px 30px",
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <Car size={30} style={{ marginBottom: 14, opacity: 0.6 }} />
      <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, maxWidth: 420, margin: "0 auto" }}>{desc}</div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

// ---------- Lista Vehículos ----------
function VehiculoTable({ vehiculos, onAbrir }) {
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

function ListaVehiculos({ vehiculos, socios, onNuevo, onAbrir }) {
  const [filtro, setFiltro] = useState("todos");
  const filtrados = vehiculos.filter((v) => (filtro === "todos" ? true : filtro === "stock" ? v.estado === ESTADOS.STOCK : v.estado === ESTADOS.VENDIDO));

  return (
    <div>
      <PageHeader
        title="Vehículos"
        desc="Compras, gastos y ventas de cada unidad de la flota."
        action={
          <button className="btn-primary" onClick={onNuevo}>
            <Plus size={16} /> Nuevo vehículo
          </button>
        }
      />

      {vehiculos.length === 0 ? (
        <EmptyState
          title="No hay vehículos cargados todavía"
          desc="Registrá la primera compra: marca, modelo, precio y qué porcentaje aportó cada socio."
          action={
            <button className="btn-primary" onClick={onNuevo}>
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
          <VehiculoTable vehiculos={filtrados} onAbrir={onAbrir} />
        </>
      )}
    </div>
  );
}

// ---------- Detalle Vehículo ----------
function DetalleVehiculo({ vehiculo, socios, onVolver, onAddGasto, onDeleteGasto, onAddFoto, onDeleteFoto, onVender, onReabrir, onEditar, onEliminar }) {
  const [gForm, setGForm] = useState({ tipo: TIPO_GASTO[0], monto: "", fecha: new Date().toISOString().slice(0, 10), descripcion: "" });
  const [fotoUrl, setFotoUrl] = useState("");
  const g = ganancia(vehiculo);
  const costo = costoTotal(vehiculo);
  const gastos = sumGastos(vehiculo);

  function submitFoto(e) {
    e.preventDefault();
    if (!fotoUrl.trim()) return;
    onAddFoto(fotoUrl.trim());
    setFotoUrl("");
  }

  function socioName(id) {
    return socios.find((s) => s.id === id)?.nombre || "Socio eliminado";
  }
  function socioColor(id) {
    return socios.find((s) => s.id === id)?.color || "var(--text-muted)";
  }

  function submitGasto(e) {
    e.preventDefault();
    if (!gForm.monto) return;
    onAddGasto({ ...gForm, monto: Number(gForm.monto) });
    setGForm({ tipo: TIPO_GASTO[0], monto: "", fecha: new Date().toISOString().slice(0, 10), descripcion: "" });
  }

  return (
    <div>
      <button className="btn-ghost" onClick={onVolver} style={{ marginBottom: 18 }}>
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
          <button className="btn-ghost" onClick={onEditar}><Pencil size={15} /> Editar ficha</button>
          {vehiculo.estado === ESTADOS.STOCK ? (
            <button className="btn-primary" onClick={onVender}><DollarSign size={16} /> Registrar venta</button>
          ) : (
            <button className="btn-ghost" onClick={onReabrir}>Deshacer venta</button>
          )}
          <button className="btn-danger" onClick={onEliminar}><Trash2 size={15} /> Eliminar</button>
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
        <form onSubmit={submitFoto} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Input
            placeholder="Pegá el link de una foto (URL) y sumala a la ficha"
            value={fotoUrl}
            onChange={(e) => setFotoUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-ghost" style={{ whiteSpace: "nowrap" }}>
            <ImagePlus size={15} /> Agregar
          </button>
        </form>
        {(vehiculo.fotos || []).length === 0 ? (
          <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 20, color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <ImageIcon size={16} /> Todavía no hay fotos cargadas para este vehículo.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {vehiculo.fotos.map((f) => (
              <div key={f.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "4/3", background: "var(--surface-2)" }}>
                <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button
                  className="icon-btn"
                  onClick={() => onDeleteFoto(f.id)}
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
        {/* Participación */}
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

        {/* Gastos */}
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
              <Plus size={15} /> Agregar gasto
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
                    <button className="icon-btn" onClick={() => onDeleteGasto(g2.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {vehiculo.estado === ESTADOS.VENDIDO && (
        <div style={{ marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
          Vendido el {fmtDate(vehiculo.fechaVenta)}{vehiculo.comprador ? ` a ${vehiculo.comprador}` : ""}.
        </div>
      )}
    </div>
  );
}

// ---------- Lista Socios ----------
function ListaSocios({ socios, vehiculos, gananciaPorSocio, onNuevo, onEliminar }) {
  return (
    <div>
      <PageHeader
        title="Socios"
        desc="Quiénes integran la sociedad y su resultado acumulado."
        action={
          <button className="btn-primary" onClick={onNuevo}>
            <Plus size={16} /> Nuevo socio
          </button>
        }
      />

      {socios.length === 0 ? (
        <EmptyState
          title="Todavía no cargaste socios"
          desc="Agregá a cada integrante de la sociedad para poder asignarles un porcentaje de participación en cada compra."
          action={<button className="btn-primary" onClick={onNuevo}><Plus size={16} /> Agregar socio</button>}
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
                  <button className="icon-btn" onClick={() => onEliminar(s.id)}><Trash2 size={15} /></button>
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
    </div>
  );
}

// ---------- Formularios ----------
function FormSocio({ onClose, onSave }) {
  const [nombre, setNombre] = useState("");
  return (
    <Modal title="Nuevo socio" onClose={onClose} width={420}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          onSave(nombre.trim());
        }}
      >
        <Field label="Nombre del socio">
          <Input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Martín Gómez" />
        </Field>
        <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          Guardar socio
        </button>
      </form>
    </Modal>
  );
}

function FormVehiculo({ socios, onClose, onSave, onNecesitaSocio }) {
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

  const total = pctSum(participaciones);

  function setPct(socioId, val) {
    setParticipaciones((prev) => prev.map((p) => (p.socioId === socioId ? { ...p, porcentaje: val } : p)));
  }

  function submit(e) {
    e.preventDefault();
    if (!f.marca || !f.precioCompra) return;
    onSave({ ...f, participaciones: participaciones.filter((p) => Number(p.porcentaje) > 0) });
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

        <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
          <Sparkles size={15} /> Guardar vehículo
        </button>
      </form>
    </Modal>
  );
}

function FormEditarVehiculo({ vehiculo, onClose, onSave }) {
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
  if (!vehiculo) return null;

  return (
    <Modal title={`Editar ficha · ${vehiculo.marca} ${vehiculo.modelo}`} onClose={onClose} width={620}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(f);
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
        <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          Guardar cambios
        </button>
      </form>
    </Modal>
  );
}

function FormVenta({ vehiculo, onClose, onSave }) {
  const [f, setF] = useState({ fechaVenta: new Date().toISOString().slice(0, 10), precioVenta: "", comprador: "" });
  if (!vehiculo) return null;
  const costo = costoTotal(vehiculo);
  const proyectado = f.precioVenta ? Number(f.precioVenta) - costo : null;

  return (
    <Modal title={`Registrar venta · ${vehiculo.marca} ${vehiculo.modelo}`} onClose={onClose} width={460}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.precioVenta) return;
          onSave(f);
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

        <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
          Confirmar venta
        </button>
      </form>
    </Modal>
  );
}
