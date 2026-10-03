import type { ReactNode } from "react";
import { CLASES_DE_DATO, CLASES_DE_ETIQUETA } from "./estilos";

/** La celda que identifica la fila: tipografia Title, tinta plena. */
export function CeldaPrincipal({ children }: { children: ReactNode }) {
  return (
    <span className="truncate text-[15px] font-semibold text-caliza-tinta">
      {children}
    </span>
  );
}

/** CURP, folio, fecha: tipografia Dato, `tabular-nums`, tono apagado. */
export function CeldaDeDato({ children }: { children: ReactNode }) {
  return <span className={`truncate ${CLASES_DE_DATO}`}>{children}</span>;
}

/**
 * Dato de apoyo que no es un identificador: un tipo, un area, un nombre.
 * Label en apagada; Dato (mono) es solo para CURP, folios y fechas.
 */
export function CeldaDeApoyo({ children }: { children: ReactNode }) {
  return <span className={`truncate ${CLASES_DE_ETIQUETA}`}>{children}</span>;
}
