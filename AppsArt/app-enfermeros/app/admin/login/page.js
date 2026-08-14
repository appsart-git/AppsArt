"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import AuthCard from "@/components/AuthCard";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Clave incorrecta.");
    }
  }

  return (
    <AuthCard icon={<ShieldCheck size={18} color="#fff" />} title="Panel de administración">
      <form onSubmit={submit}>
        <div className="field">
          <label>Clave de acceso</label>
          <input
            type="password"
            autoFocus
            required
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </div>
        {error && <div style={{ color: "var(--red)", fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </AuthCard>
  );
}
