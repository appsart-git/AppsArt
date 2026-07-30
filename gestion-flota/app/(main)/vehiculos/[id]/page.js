import { VehiculoDetalleView } from "@/components/views/VehiculoDetalleView";

export default async function Page({ params }) {
  const { id } = await params;
  return <VehiculoDetalleView id={id} />;
}
