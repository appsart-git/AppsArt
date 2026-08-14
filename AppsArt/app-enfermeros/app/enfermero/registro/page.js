"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AuthCard from "@/components/AuthCard";

const ZONAS = ["CABA Norte", "CABA Sur", "CABA Centro", "GBA Norte", "GBA Oeste", "GBA Sur"];

export default function RegistroEnfermeroPage() {
  const [form, setForm] = useState({ nombre: "", telefono: "", zona: ZONAS[0], matricula: "", email: "", password: "" });
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!archivo) {
      setError("Subí una foto o PDF de tu matrícula.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      setError("No se pudo crear la cuenta. Probá de nuevo.");
      return;
    }

    const ext = archivo.name.split(".").pop();
    const path = `${userId}/matricula.${ext}`;
    const { error: uploadError } = await supabase.storage.from("matriculas").upload(path, archivo, {
      upsert: true,
    });
    if (uploadError) {
      setLoading(false);
      setError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("enfermeros").insert({
      id: userId,
      nombre: form.nombre,
      telefono: form.telefono,
      zona: form.zona,
      matricula: form.matricula,
      matricula_archivo_url: path,
      estado: "pendiente",
    });
    if (insertError) {
      setLoading(false);
      setError(insertError.message);
      return;
    }

    setLoading(false);
    router.push("/enfermero");
  }

  return (
    <AuthCard
      icon={<Stethoscope size={18} color="#fff" />}
      title="Sumate como enfermero"
      subtitle="Revisamos tu matrícula antes de activarte en la plataforma."
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre y apellido</label>
          <input required value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input required value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
        </div>
        <div className="field">
          <label>Zona</label>
          <select value={form.zona} onChange={(e) => update("zona", e.target.value)}>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>N° de matrícula</label>
          <input required value={form.matricula} onChange={(e) => update("matricula", e.target.value)} />
        </div>
        <div className="field">
          <label>Foto o PDF de la matrícula</label>
          <input
            type="file"
            required
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
        </div>
        {error && <div style={{ color: "var(--red)", fontSize: 13.5, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
          {loading ? "Enviando…" : "Enviar registro"}
        </button>
      </form>
      <p style={{ textAlign: "center", fontSize: 13.5, marginTop: 16, color: "var(--text-muted)" }}>
        ¿Ya tenés cuenta?{" "}
        <a href="/enfermero/login" style={{ color: "var(--teal-dark)", fontWeight: 600 }}>
          Iniciar sesión
        </a>
      </p>
    </AuthCard>
  );
}
