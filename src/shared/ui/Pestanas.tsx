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
  /**
   * El nombre completo que anuncia el lector de pantalla. La etiqueta
   * visible y la cuenta son dos nodos pegados -"Calles3"-; aca van
   * separados y con el alcance de la cuenta escrito.
   */
  etiquetaAccesible?: string;
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
      className="-mb-px flex flex-wrap gap-x-1 border-b border-caliza-divisor"
    >
      {pestanas.map((pestana) => (
        <Link
          key={pestana.clave}
          href={pestana.href}
          aria-current={pestana.activa ? "page" : undefined}
          aria-label={pestana.etiquetaAccesible}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-2 py-2.5 sm:gap-2 sm:px-4 text-[15px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca ${
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
