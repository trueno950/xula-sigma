import type { ReactNode } from "react";
import { CLASES_DE_TARJETA } from "@/shared/ui";

const ID_DE_TITULO = "acciones-del-reporte";

/**
 * La columna de acciones del detalle (S13 de `reportes-ux`): la tarjeta con
 * el paso siguiente arriba y todo lo demas plegado, pegada al borde superior
 * mientras la ficha y el historial siguen su curso.
 *
 * El `sticky` es `lg:` y no un valor suelto: debajo de 1024px no hay
 * columnas, asi que la pantalla la pone en el flujo entre la ficha y el
 * historial y pegar nada tendria sentido.
 */
export function PanelDeAcciones({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-labelledby={ID_DE_TITULO}
      className="flex flex-col gap-3 lg:sticky lg:top-6"
    >
      <section className={`flex flex-col gap-3 ${CLASES_DE_TARJETA}`}>
        <h2
          id={ID_DE_TITULO}
          className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta"
        >
          Acciones
        </h2>
        {children}
      </section>
    </aside>
  );
}
