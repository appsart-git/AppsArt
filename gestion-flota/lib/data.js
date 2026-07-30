import { supabase } from "./supabaseClient";
import { PALETTE_SOCIOS, uid } from "./derived";

const FOTOS_BUCKET = "fotos-vehiculos";

function mapSocio(row) {
  return { id: row.id, nombre: row.nombre, color: row.color };
}

function mapVehiculo(row) {
  return {
    id: row.id,
    marca: row.marca,
    modelo: row.modelo,
    anio: row.anio,
    patente: row.patente,
    kilometraje: row.kilometraje,
    condicion: row.condicion,
    documentacion: row.documentacion,
    notasDocumentacion: row.notas_documentacion,
    fechaCompra: row.fecha_compra,
    precioCompra: row.precio_compra,
    vendedor: row.vendedor,
    estado: row.estado,
    fechaVenta: row.fecha_venta,
    precioVenta: row.precio_venta,
    comprador: row.comprador,
    participaciones: (row.participaciones || []).map((p) => ({ socioId: p.socio_id, porcentaje: p.porcentaje })),
    gastos: (row.gastos || []).map((g) => ({ id: g.id, tipo: g.tipo, monto: g.monto, fecha: g.fecha, descripcion: g.descripcion })),
    fotos: (row.fotos || []).map((f) => ({ id: f.id, url: f.url, storagePath: f.storage_path })),
  };
}

// ---------- socios ----------
export async function getSocios() {
  const { data, error } = await supabase.from("socios").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapSocio);
}

export async function addSocio(nombre, socioCountActual) {
  const color = PALETTE_SOCIOS[socioCountActual % PALETTE_SOCIOS.length];
  const { data, error } = await supabase.from("socios").insert({ nombre, color }).select().single();
  if (error) throw error;
  return mapSocio(data);
}

export async function deleteSocio(id) {
  const { error } = await supabase.from("socios").delete().eq("id", id);
  if (error) throw error;
}

// ---------- vehiculos ----------
const VEHICULO_SELECT = "*, participaciones(*), gastos(*), fotos(*)";

export async function getVehiculos() {
  const { data, error } = await supabase
    .from("vehiculos")
    .select(VEHICULO_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapVehiculo);
}

export async function addVehiculo(v) {
  const { data: vehiculo, error } = await supabase
    .from("vehiculos")
    .insert({
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio || null,
      patente: v.patente || null,
      kilometraje: v.kilometraje || null,
      condicion: v.condicion || null,
      documentacion: v.documentacion || null,
      notas_documentacion: v.notasDocumentacion || null,
      fecha_compra: v.fechaCompra || null,
      precio_compra: Number(v.precioCompra) || 0,
      vendedor: v.vendedor || null,
      estado: "en_stock",
    })
    .select()
    .single();
  if (error) throw error;

  const participaciones = (v.participaciones || []).filter((p) => Number(p.porcentaje) > 0);
  if (participaciones.length) {
    const { error: pError } = await supabase.from("participaciones").insert(
      participaciones.map((p) => ({ vehiculo_id: vehiculo.id, socio_id: p.socioId, porcentaje: p.porcentaje }))
    );
    if (pError) throw pError;
  }

  const { data: full, error: fError } = await supabase.from("vehiculos").select(VEHICULO_SELECT).eq("id", vehiculo.id).single();
  if (fError) throw fError;
  return mapVehiculo(full);
}

export async function updateVehiculo(id, patch) {
  const dbPatch = {};
  if ("marca" in patch) dbPatch.marca = patch.marca;
  if ("modelo" in patch) dbPatch.modelo = patch.modelo;
  if ("anio" in patch) dbPatch.anio = patch.anio || null;
  if ("patente" in patch) dbPatch.patente = patch.patente || null;
  if ("kilometraje" in patch) dbPatch.kilometraje = patch.kilometraje || null;
  if ("condicion" in patch) dbPatch.condicion = patch.condicion || null;
  if ("documentacion" in patch) dbPatch.documentacion = patch.documentacion || null;
  if ("notasDocumentacion" in patch) dbPatch.notas_documentacion = patch.notasDocumentacion || null;
  if ("vendedor" in patch) dbPatch.vendedor = patch.vendedor || null;
  const { error } = await supabase.from("vehiculos").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteVehiculo(id) {
  const { data: fotos } = await supabase.from("fotos").select("storage_path").eq("vehiculo_id", id);
  const paths = (fotos || []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(FOTOS_BUCKET).remove(paths);
  const { error } = await supabase.from("vehiculos").delete().eq("id", id);
  if (error) throw error;
}

export async function registrarVenta(vehiculoId, venta) {
  const { error } = await supabase
    .from("vehiculos")
    .update({
      estado: "vendido",
      fecha_venta: venta.fechaVenta || null,
      precio_venta: Number(venta.precioVenta) || 0,
      comprador: venta.comprador || null,
    })
    .eq("id", vehiculoId);
  if (error) throw error;
}

export async function reabrirVenta(vehiculoId) {
  const { error } = await supabase.from("vehiculos").update({ estado: "en_stock" }).eq("id", vehiculoId);
  if (error) throw error;
}

// ---------- gastos ----------
export async function addGasto(vehiculoId, gasto) {
  const { error } = await supabase.from("gastos").insert({
    vehiculo_id: vehiculoId,
    tipo: gasto.tipo,
    monto: Number(gasto.monto) || 0,
    fecha: gasto.fecha || null,
    descripcion: gasto.descripcion || null,
  });
  if (error) throw error;
}

export async function deleteGasto(id) {
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) throw error;
}

// ---------- fotos ----------
export async function uploadFoto(vehiculoId, file) {
  const path = `${vehiculoId}/${uid()}-${file.name}`;
  const { error: upError } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file);
  if (upError) throw upError;
  const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path);
  const { error } = await supabase.from("fotos").insert({ vehiculo_id: vehiculoId, url: pub.publicUrl, storage_path: path });
  if (error) throw error;
}

export async function deleteFoto(id, storagePath) {
  if (storagePath) await supabase.storage.from(FOTOS_BUCKET).remove([storagePath]);
  const { error } = await supabase.from("fotos").delete().eq("id", id);
  if (error) throw error;
}
