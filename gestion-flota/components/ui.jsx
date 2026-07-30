"use client";
import { X, Car } from "lucide-react";

export function Badge({ children, tone = "neutral" }) {
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

export function Plate({ children }) {
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

export function Modal({ title, onClose, children, width = 560 }) {
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

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.03em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle = {
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

export function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function Select(props) {
  return (
    <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>
      {props.children}
    </select>
  );
}

export function StatCard({ icon: Icon, label, value, tone, sub }) {
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

export function SectionTitle({ children }) {
  return (
    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 12px" }}>
      {children}
    </h3>
  );
}

export function PageHeader({ title, desc, action }) {
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

export function EmptyState({ title, desc, action }) {
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
