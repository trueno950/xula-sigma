import type { ReactNode } from "react";
import { CLASES_DE_ETIQUETA } from "./estilos";

/**
 * Datos de un registro como una tarjeta de filas definicion: etiqueta
 * apagada y valor en tinta, separadas por divisores completos de 1px.
 */
export function FichaDeDatos({ children }: { children: ReactNode }) {
  return (
    <dl className="divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo">
      {children}
    </dl>
  );
}

/** `dato` es para CURP, folios y fechas: monoespaciada y tabular. */
export function FilaDeFicha({
  etiqueta,
  dato = false,
  children,
}: {
  etiqueta: string;
  dato?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
      <dt className={`${CLASES_DE_ETIQUETA} sm:w-40 sm:shrink-0 sm:pt-0.5`}>
        {etiqueta}
      </dt>
      <dd
        className={`min-w-0 break-words text-caliza-tinta ${
          dato ? "font-mono text-[14px] tabular-nums" : "text-[15px]"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}
