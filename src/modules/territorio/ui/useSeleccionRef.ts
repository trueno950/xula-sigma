"use client";

import { type RefObject, useEffect, useRef } from "react";
import type { PuntoGeografico } from "../domain";

export function useSeleccionRef(
  onSelect: (punto: PuntoGeografico) => void,
): RefObject<(punto: PuntoGeografico) => void> {
  const seleccionRef = useRef(onSelect);

  useEffect(() => {
    seleccionRef.current = onSelect;
  }, [onSelect]);

  return seleccionRef;
}
