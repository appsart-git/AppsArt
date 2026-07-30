"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, Users, Gauge, LogOut } from "lucide-react";

export function Shell({ children, saving }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = [
    { id: "/", label: "Panel", icon: Gauge },
    { id: "/vehiculos", label: "Vehículos", icon: Car },
    { id: "/socios", label: "Socios", icon: Users },
  ];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        fontFamily: "var(--font-body)",
      }}
    >
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
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.03em", lineHeight: 1 }}>GESTIÓN</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              de Flota
            </div>
          </div>
        </div>

        {nav.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.id;
          return (
            <Link
              key={n.id}
              href={n.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 7,
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                textAlign: "left",
                textDecoration: "none",
                borderLeft: active ? "3px solid var(--amber)" : "3px solid transparent",
              }}
            >
              <Icon size={17} />
              {n.label}
            </Link>
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
          <button onClick={logout} className="icon-btn" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "28px 34px", minWidth: 0 }}>{children}</main>
    </div>
  );
}
