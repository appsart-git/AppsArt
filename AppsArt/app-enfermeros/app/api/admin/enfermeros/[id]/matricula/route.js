import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await params;

  const { data: enfermero, error: fetchError } = await supabaseAdmin
    .from("enfermeros")
    .select("matricula_archivo_url")
    .eq("id", id)
    .single();

  if (fetchError || !enfermero?.matricula_archivo_url) {
    return NextResponse.json({ ok: false, error: "no encontrado" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("matriculas")
    .createSignedUrl(enfermero.matricula_archivo_url, 60 * 5);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
