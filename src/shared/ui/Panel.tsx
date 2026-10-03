import type { ReactNode } from "react";
import { CLASES_DE_TARJETA } from "./estilos";

/**
 * La tarjeta de `DESIGN.md`: ver `CLASES_DE_TARJETA`. La usa lo que se abre
 * —un formulario que aparece dentro de una pestana— para que se lea como
 * una capa aparte de la lista que lo disparo, sin sacarlo de la pagina con
 * un dialogo.
 *
 * Mide como un formulario (720px) y no estira el boton de envio ni
 * "Cancelar" en escritorio: el campo ancho de 1200px no ayuda a leer.
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
    <section
      className={`flex w-full max-w-[720px] flex-col gap-4 ${CLASES_DE_TARJETA} md:p-6 [&>a]:self-start [&_form>button]:self-start max-sm:[&>a]:self-stretch max-sm:[&_form>button]:self-stretch`}
    >
      <h3 className="text-[15px] font-semibold text-caliza-tinta">{titulo}</h3>
      {children}
    </section>
  );
}
