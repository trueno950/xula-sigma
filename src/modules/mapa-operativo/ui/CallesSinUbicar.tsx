import Link from "next/link";
import { CLASES_DE_ENLACE } from "@/shared/ui";
import type { TerritorioSinUbicar } from "../domain";

const FILA =
  "flex flex-wrap items-baseline gap-x-2 border-b border-caliza-divisor px-4 py-2 text-[15px] last:border-b-0";

const cuantas = (total: number) =>
  `${total} ${total === 1 ? "calle sin ubicar" : "calles sin ubicar"}`;

/**
 * Las calles activas que no tienen punto, agrupadas por el territorio al que
 * pertenecen (S6). Cada una dice donde se ubica, porque el dato que falta es
 * justamente el que la hace invisible en el mapa.
 *
 * Vivio debajo del mapa como seccion propia hasta el rediseno; ahora es una
 * parte de la pestana «Sin ubicar», que es el unico lugar donde se lee lo que
 * no se puede dibujar.
 */
export function CallesSinUbicar({
  sinUbicar,
}: {
  sinUbicar: readonly TerritorioSinUbicar[];
}) {
  if (sinUbicar.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {sinUbicar.map((territorio) => (
        <div key={territorio.id} className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-caliza-tinta">
            {territorio.nombre} · {cuantas(territorio.calles.length)}
          </h2>
          <ul
            className="flex flex-col"
            aria-label={`Calles sin ubicar en ${territorio.nombre}`}
          >
            {territorio.calles.map((calle) => (
              <li key={calle.id} className={FILA}>
                <Link href={calle.href} className={CLASES_DE_ENLACE}>
                  {calle.nombre}
                </Link>
                <span className="ml-auto text-[13px] text-caliza-apagada">
                  Ubicar en el mapa
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
