import type { ReactNode } from "react";

/**
 * La superficie de `DESIGN.md`, Cards: caliza-superficie sobre lienzo, 6px,
 * sin sombra. La usa lo que se abre —un formulario que aparece dentro de
 * una pestana— para que se lea como una capa aparte de la lista que lo
 * disparo, sin sacarlo de la pagina con un dialogo.
 *
 * **Prohibido anidar** (mismo documento): un panel dentro de otro significa
 * que la jerarquia se resolvio con cajas en vez de con tipografia. No hay
 * nada en el codigo que lo impida; el que lo hace es el que revisa.
 */
export function Panel({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-caliza-divisor bg-caliza-superficie p-4">
      <h3 className="text-[15px] font-semibold text-caliza-tinta">{titulo}</h3>
      {children}
    </section>
  );
}
