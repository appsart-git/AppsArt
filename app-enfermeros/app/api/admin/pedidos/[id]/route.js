import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CAMPOS_PERMITIDOS = ["enfermero_id", "estado", "precio", "pago_estado"];

export async function PATCH(request, { params }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const update = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in body) update[campo] = body[campo];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "nada para actualizar" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("pedidos").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
