"use client";

import type { ReactNode } from "react";
import { useAbiertoEnEscritorio } from "./useAbiertoEnEscritorio";

type Props = {
  /** Los filtros puestos: es el N de «Filtros (N)». */
  activos: number;
  /** La barra de filtros, que sigue siendo un componente del servidor. */
  children: ReactNode;
};

/**
 * S2: por debajo de 1024px la barra de filtros se pliega y el mapa queda
 * justo debajo del resumen; desde 1024px se ve entera. El `<details>` sale del
 * servidor **cerrado** -el telefono no se queda con 450px de formulario antes
 * del mapa- y esta hoja lo abre al montar si la ventana es de escritorio.
 *
 * Sin JavaScript el escritorio abre los filtros con un clic: es la unica
 * perdida, y es menor que la de un telefono que nunca llega al mapa.
 */
export function PliegueDeFiltros({ activos, children }: Props) {
  const pliegueRef = useAbiertoEnEscritorio();

  return (
    <details
      ref={pliegueRef}
      className="rounded-lg border border-caliza-divisor bg-caliza-lienzo p-0 shadow-reposo lg:border-0 lg:bg-transparent lg:shadow-none"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-semibold text-caliza-tinta lg:[[open]>&]:hidden">
        Filtros
        <span className="font-mono text-[14px] tabular-nums text-caliza-apagada">
          ({activos})
        </span>
      </summary>
      {children}
    </details>
  );
}
