import Link from "next/link";
import { CLASES_DE_DATO } from "./estilos";

export type Pestana = {
  clave: string;
  etiqueta: string;
  href: string;
  activa: boolean;
  /**
   * Cuantos elementos hay adentro. Es la diferencia entre una pestana y una
   * pregunta: sin el numero hay que entrar a cada una para saber si tiene
   * algo, y en un lugar con cuatro pestanas eso son cuatro viajes.
   */
  cuenta?: number;
};

/**
 * Pestanas que son enlaces, no estado de cliente: cada una tiene su URL, y
 * la pantalla se puede compartir, marcar y recargar donde estaba.
 *
 * `aria-current` **y** peso de tipografia **y** subrayado de 2px: la activa
 * no se distingue solo por color, que es la regla de `DESIGN.md` para todo
 * estado.
 */
export function Pestanas({
  pestanas,
  etiqueta,
}: {
  pestanas: readonly Pestana[];
  etiqueta: string;
}) {
  return (
    <nav
      aria-label={etiqueta}
      className="-mb-px flex gap-1 overflow-x-auto border-b border-caliza-divisor"
    >
      {pestanas.map((pestana) => (
        <Link
          key={pestana.clave}
          href={pestana.href}
          aria-current={pestana.activa ? "page" : undefined}
          className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca ${
            pestana.activa
              ? "border-marca font-medium text-caliza-tinta"
              : "border-transparent text-caliza-apagada hover:text-caliza-tinta"
          }`}
        >
          {pestana.etiqueta}
          {pestana.cuenta === undefined ? null : (
            <span className={CLASES_DE_DATO}>{pestana.cuenta}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
