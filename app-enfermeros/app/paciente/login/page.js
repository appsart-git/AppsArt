"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AuthCard from "@/components/AuthCard";

export default function LoginPacientePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    router.push("/paciente");
  }

  return (
    <AuthCard icon={<HeartPulse size={18} color="#fff" />} title="Iniciar sesión">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: "var(--red)", fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <p style={{ textAlign: "center", fontSize: 13.5, marginTop: 16, color: "var(--text-muted)" }}>
        ¿No tenés cuenta?{" "}
        <a href="/paciente/registro" style={{ color: "var(--teal-dark)", fontWeight: 600 }}>
          Crear una
        </a>
      </p>
    </AuthCard>
  );
}
