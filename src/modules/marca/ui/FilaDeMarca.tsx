import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { CLASES_DE_ETIQUETA } from "@/shared/ui/estilos";

type Props = {
  /** El titulo de la seccion (S5): se queda a la vista con la fila cerrada. */
  titulo: string;
  /** El estado actual en **una linea**: se revisa la marca sin abrir nada. */
  estado: string;
  /** Una marca chica a la derecha: el escudo o los dos puntos de color. */
  extra?: ReactNode;
  abierto?: boolean;
  children: ReactNode;
};

/**
 * Una fila plegable de `/marca`: `<details>` nativo con `name` compartido, asi
 * que abrir una cierra las otras sin estado de cliente y sin JavaScript
 * (artboard `02-vista-previa-primero`, "Como se comporta").
 *
 * El `summary` es el resumen: titulo, estado actual y la marca chica. Eso es
 * lo que hace barato bajar la pantalla entera cerrada —tres lineas en vez de
 * tres formularios— y lo que cuesta tener dos cuerpos que no se ven a la vez,
 * que es el compromiso aceptado en L5.
 *
 * El cuerpo va sobre `caliza-superficie` y no sobre otra tarjeta: la fila ya
 * vive dentro de la tarjeta del indice y una tarjeta anidada esta prohibida
 * (`CLASES_DE_TARJETA`).
 */
export function FilaDeMarca({
  titulo,
  estado,
  extra,
  abierto,
  children,
}: Props) {
  return (
    <details name="seccionesDeMarca" open={abierto} className="group/fila">
      <summary className="flex min-h-18 cursor-pointer list-none items-center gap-4 px-5 py-3 transition-colors duration-150 ease-salida hover:bg-caliza-superficie group-open/fila:bg-caliza-superficie [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[15px] leading-[1.4] font-semibold text-caliza-tinta">
            {titulo}
          </h2>
          <span className={CLASES_DE_ETIQUETA}>{estado}</span>
        </span>
        {extra}
        <CaretDown
          size={20}
          aria-hidden="true"
          className="shrink-0 text-caliza-apagada transition-transform duration-150 ease-salida group-open/fila:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 border-t border-caliza-divisor bg-caliza-superficie px-5 pt-4 pb-5">
        {children}
      </div>
    </details>
  );
}
