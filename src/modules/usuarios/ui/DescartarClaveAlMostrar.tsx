"use client";

import { useEffect } from "react";
import { descartarClaveMostradaAction } from "./actions/descartarClaveMostradaAction";

/**
 * Hoja cliente por una sola razon: borrar la cookie de la clave temporal pide
 * una Server Function, y `AvisoDeClaveTemporal` es un Server Component.
 */
export function DescartarClaveAlMostrar({ token }: { token: string }) {
  useEffect(() => {
    void descartarClaveMostradaAction(token);
  }, [token]);
  return null;
}
