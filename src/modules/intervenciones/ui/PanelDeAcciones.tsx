import type { ReactNode } from "react";
import { CLASES_DE_TARJETA } from "@/shared/ui";

const ID_DE_TITULO = "acciones-de-la-intervencion";

/**
 * La columna de acciones del detalle (S12): la tarjeta con el paso siguiente
 * arriba y lo demas plegado, pegada al borde superior mientras la ficha y el
 * historial siguen su curso.
 *
 * Es el mismo panel que `PanelDeAcciones` de `reportes` y no se importa de
 * alli: un modulo no importa la UI de otro (antipatron 8 de `AGENTS.md`), y
 * moverlo a `shared/ui` habria cambiado una pantalla que esta tarea no toca.
 *
 * El `sticky` es `lg:` porque debajo de 1024px no hay columnas, y el tope de
 * alto acompaña: un panel pegado mas alto que la ventana deja su final fuera
 * de alcance hasta que la pagina termina.
 */
export function PanelDeAcciones({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-labelledby={ID_DE_TITULO}
      className="flex flex-col gap-3 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
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
