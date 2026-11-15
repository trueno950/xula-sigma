"use client";

import { useEffect } from "react";
import { descartarClaveMostradaAction } from "./actions/descartarClaveMostradaAction";

/** Hoja cliente: borrar la cookie pide una Server Function (S2). */
export function DescartarClaveAlMostrar({ token }: { token: string }) {
  useEffect(() => {
    void descartarClaveMostradaAction(token);
  }, [token]);
  return null;
}
