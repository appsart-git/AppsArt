"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as db from "./data";
import { useRealtimeRefresh } from "./useRealtimeRefresh";

const FleetDataContext = createContext(null);

export function FleetDataProvider({ children }) {
  const [socios, setSocios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [s, v] = await Promise.all([db.getSocios(), db.getVehiculos()]);
    setSocios(s);
    setVehiculos(v);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeRefresh(refresh);

  async function addSocio(nombre) {
    await db.addSocio(nombre, socios.length);
    await refresh();
  }
  async function deleteSocio(id) {
    await db.deleteSocio(id);
    await refresh();
  }
  async function addVehiculo(v) {
    await db.addVehiculo(v);
    await refresh();
  }
  async function updateVehiculo(id, patch) {
    await db.updateVehiculo(id, patch);
    await refresh();
  }
  async function deleteVehiculo(id) {
    await db.deleteVehiculo(id);
    await refresh();
  }
  async function addGasto(vehiculoId, gasto) {
    await db.addGasto(vehiculoId, gasto);
    await refresh();
  }
  async function deleteGasto(id) {
    await db.deleteGasto(id);
    await refresh();
  }
  async function uploadFoto(vehiculoId, file) {
    await db.uploadFoto(vehiculoId, file);
    await refresh();
  }
  async function deleteFoto(id, storagePath) {
    await db.deleteFoto(id, storagePath);
    await refresh();
  }
  async function registrarVenta(vehiculoId, venta) {
    await db.registrarVenta(vehiculoId, venta);
    await refresh();
  }
  async function reabrirVenta(vehiculoId) {
    await db.reabrirVenta(vehiculoId);
    await refresh();
  }

  const value = {
    socios,
    vehiculos,
    loading,
    refresh,
    addSocio,
    deleteSocio,
    addVehiculo,
    updateVehiculo,
    deleteVehiculo,
    addGasto,
    deleteGasto,
    uploadFoto,
    deleteFoto,
    registrarVenta,
    reabrirVenta,
  };

  return <FleetDataContext.Provider value={value}>{children}</FleetDataContext.Provider>;
}

export function useFleetData() {
  const ctx = useContext(FleetDataContext);
  if (!ctx) throw new Error("useFleetData debe usarse dentro de FleetDataProvider");
  return ctx;
}
