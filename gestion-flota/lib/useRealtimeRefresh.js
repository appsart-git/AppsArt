"use client";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

const TABLES = ["socios", "vehiculos", "participaciones", "gastos", "fotos"];

// Vuelve a pedir los datos cuando cualquier socio inserta/edita/borra algo,
// para que varios socios vean los cambios de los demás sin recargar la página.
export function useRealtimeRefresh(onChange) {
  useEffect(() => {
    const channel = supabase.channel("gestion-flota-changes");
    TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
