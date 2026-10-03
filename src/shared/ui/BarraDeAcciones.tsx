import type { ReactNode } from "react";

/**
 * El pie de un formulario: la accion primaria y, si la hay, "Cancelar".
 * En escritorio mide lo que su texto y va a la derecha; en el movil cada
 * boton ocupa el ancho y la primaria queda arriba, al alcance del pulgar.
 */
export function BarraDeAcciones({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-caliza-divisor pt-5 sm:flex-row-reverse sm:justify-start [&>*]:w-full sm:[&>*]:w-auto">
      {children}
    </div>
  );
}
