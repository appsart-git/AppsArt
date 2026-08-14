import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }

  const { data: enfermeros } = await supabaseAdmin
    .from("enfermeros")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: pedidos } = await supabaseAdmin
    .from("pedidos")
    .select("*, pacientes(nombre, telefono)")
    .order("created_at", { ascending: false });

  return <AdminDashboardClient enfermerosIniciales={enfermeros || []} pedidosIniciales={pedidos || []} />;
}
