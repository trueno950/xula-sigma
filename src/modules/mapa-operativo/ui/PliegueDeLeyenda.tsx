"use client";

import type { ReactNode } from "react";
import { useAbiertoEnEscritorio } from "./useAbiertoEnEscritorio";

/**
 * S3: la leyenda sale del servidor **abierta** -sin JavaScript se lee
 * entera- y en el telefono se pliega al montar: abierta tapa casi todo el
 * mapa, que es lo primero que la pantalla tiene que mostrar ahi.
 */
export function PliegueDeLeyenda({ children }: { children: ReactNode }) {
  const pliegueRef = useAbiertoEnEscritorio();

  return (
    <details
      ref={pliegueRef}
      open
      className="overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-flotante"
    >
      {children}
    </details>
  );
}
