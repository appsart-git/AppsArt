import Link from "next/link";
import { HeartPulse, Stethoscope, ShieldCheck, MapPin } from "lucide-react";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "linear-gradient(135deg,var(--teal),var(--teal-dark))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HeartPulse size={19} color="#fff" />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>
          Enfermeros a Domicilio
        </div>
      </header>

      <main style={{ flex: 1, padding: "20px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <section style={{ textAlign: "center", padding: "24px 0 32px" }}>
          <h1 style={{ fontSize: 26, lineHeight: 1.3, marginBottom: 10 }}>
            Enfermeros matriculados,{" "}
            <span style={{ color: "var(--teal)" }}>a domicilio</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.5 }}>
            Curaciones, inyecciones, control de signos vitales y cuidado post-operatorio,
            con enfermeros verificados en tu zona.
          </p>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/paciente/registro" className="btn-primary" style={{ textDecoration: "none" }}>
            Pedir un enfermero
          </Link>
          <Link href="/enfermero/registro" className="btn-ghost" style={{ textDecoration: "none" }}>
            Sumarme como enfermero
          </Link>
        </div>

        <section style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <ShieldCheck size={22} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Matrícula verificada</div>
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Todos los enfermeros pasan por una revisión manual antes de quedar activos.
              </div>
            </div>
          </div>
          <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <MapPin size={22} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Por zona y horario</div>
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Elegís tu zona y el horario que necesitás, sin vueltas.
              </div>
            </div>
          </div>
          <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Stethoscope size={22} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Cuidado profesional</div>
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Curaciones, inyecciones, control post-operatorio y más.
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ textAlign: "center", padding: 18, fontSize: 12.5, color: "var(--text-muted)" }}>
        ¿Ya tenés cuenta?{" "}
        <Link href="/paciente/login" style={{ color: "var(--teal-dark)", fontWeight: 600 }}>
          Iniciar sesión como paciente
        </Link>{" "}
        ·{" "}
        <Link href="/enfermero/login" style={{ color: "var(--teal-dark)", fontWeight: 600 }}>
          como enfermero
        </Link>
      </footer>
    </div>
  );
}
