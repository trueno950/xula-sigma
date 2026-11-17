"use client";

import { type RefObject, useEffect, useRef } from "react";

/** El ancho a partir del cual el mapa y su panel van lado a lado (S2). */
const CONSULTA_DE_ESCRITORIO = "(min-width: 1024px)";

/**
 * Abre el `<details>` en escritorio y lo pliega en el telefono, al montar y
 * cada vez que la ventana cruza los 1024px. Lo que el servidor manda en el
 * HTML -abierto o cerrado- es lo que ve quien no tiene JavaScript.
 */
export function useAbiertoEnEscritorio(): RefObject<HTMLDetailsElement | null> {
  const ref = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_DE_ESCRITORIO);
    const aplicar = () => {
      if (ref.current) ref.current.open = consulta.matches;
    };
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  return ref;
}
