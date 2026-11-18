"use client";

import { CaretDown } from "@phosphor-icons/react/ssr";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * El ancho a partir del cual la barra de filtros se ve entera. Es el mismo
 * corte que el resto del panel usa para "escritorio" (`lg`, 1024px).
 */
const CONSULTA_DE_ESCRITORIO = "(min-width: 1024px)";

type Props = {
  /** Los filtros puestos: es el N de «Filtros (N)». */
  activos: number;
  /** La barra de filtros, que sigue siendo un componente del servidor. */
  children: ReactNode;
};

/**
 * S3 de `reportes-ux`: en el telefono la barra de filtros se pliega en
 * «Filtros (N)» -y arranca **cerrada**, para que la primera fila de la lista
 * caiga en la primera pantalla- y desde 1024px se ve entera.
 *
 * Es la misma pieza que `mapa-operativo/ui/PliegueDeFiltros`, replicada aca
 * en vez de importada: `reportes` no puede depender de las tripas de otro
 * modulo (antipatron 8 de `AGENTS.md`), y `shared/ui` no es una superficie de
 * esta tarea.
 *
 * El `<details>` sale del servidor cerrado y esta hoja lo abre al montar si
 * la ventana es de escritorio. Sin JavaScript, el escritorio abre los filtros
 * con un clic y el telefono los tiene a un toque: la unica perdida es esa, y
 * es menor que la de un telefono que nunca llega a la lista.
 */
export function PliegueDeFiltrosDeReportes({ activos, children }: Props) {
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
