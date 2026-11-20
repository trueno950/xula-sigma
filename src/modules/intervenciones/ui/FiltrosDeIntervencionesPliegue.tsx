"use client";

import { CaretDown } from "@phosphor-icons/react/ssr";
import { type ReactNode, useEffect, useRef } from "react";

/** El corte de "escritorio" del panel, el mismo de `lg` (1024px). */
const CONSULTA_DE_ESCRITORIO = "(min-width: 1024px)";

type Props = {
  /** Los filtros puestos: es el N de «Filtros (N)». */
  activos: number;
  /** La barra de filtros, que sigue siendo un componente del servidor. */
  children: ReactNode;
};

/**
 * S1 de `intervenciones-ux`: en el telefono la barra de filtros se pliega en
 * «Filtros (N)» y arranca **cerrada**, para que la primera columna del
 * tablero caiga en la primera pantalla; desde 1024px se ve entera.
 *
 * Es la misma pieza que `reportes/ui/PliegueDeFiltrosDeReportes`, replicada
 * aca en vez de importada: `intervenciones` no puede depender de las tripas
 * de otro modulo (antipatron 8 de `AGENTS.md`). Necesita JavaScript por una
 * sola razon -abrir el `<details>` al montar en escritorio, que el HTML no
 * puede decidir por ancho-, y el formulario de adentro sigue siendo el POST
 * nativo: sin JavaScript el telefono lo abre con un toque y el escritorio con
 * un clic.
 */
export function PliegueDeFiltrosDeIntervenciones({ activos, children }: Props) {
  const pliegueRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_DE_ESCRITORIO);
    const aplicar = () => {
      if (pliegueRef.current) pliegueRef.current.open = consulta.matches;
    };
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  return (
    <details
      ref={pliegueRef}
      className="group rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo lg:border-0 lg:bg-transparent lg:shadow-none"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-[15px] font-semibold text-caliza-tinta marker:content-none lg:[[open]>&]:hidden">
        Filtros
        <span className="font-mono text-[14px] tabular-nums text-caliza-apagada">
          ({activos})
        </span>
        <CaretDown
          size={16}
          aria-hidden="true"
          className="ml-auto transition-transform duration-150 ease-salida group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pt-2 pb-4 lg:p-0">{children}</div>
    </details>
  );
}
