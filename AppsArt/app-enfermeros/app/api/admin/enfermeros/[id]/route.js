import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request, { params }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const estado = body.estado;

  if (!["aprobado", "rechazado", "pendiente"].includes(estado)) {
    return NextResponse.json({ ok: false, error: "estado inválido" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("enfermeros").update({ estado }).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
