import Link from "next/link";
import { CLASES_DE_ENLACE } from "@/shared/ui";
import type { TerritorioSinUbicar } from "../domain";

const LISTA =
  "divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo";
const FILA = "flex flex-wrap items-center gap-x-2 px-5 py-2 text-[15px]";

const cuantas = (total: number) =>
  `${total} ${total === 1 ? "calle sin ubicar" : "calles sin ubicar"}`;

/**
 * S3: cuantas calles de cada territorio no tienen punto, con el enlace a cada
 * una para ubicarla. Es HTML del servidor -sin JavaScript se lee igual- y
 * respeta el `?lugar=`: el conjunto que llega ya viene acotado al territorio
 * elegido, asi que la seccion no dice "en todo el municipio" cuando la vista
 * esta en una comisaria.
 *
 * Sin calles sin punto no dibuja nada: una seccion vacia se lee como un dato
 * ("no falta ninguna") cuando en realidad no hay nada que decir.
 */
export function CallesSinUbicar({
  sinUbicar,
}: {
  sinUbicar: readonly TerritorioSinUbicar[];
}) {
  if (sinUbicar.length === 0) return null;

  return (
    <section aria-label="Calles sin ubicar" className="flex flex-col gap-3">
      <h2 className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.01em] text-caliza-tinta">
        Calles sin ubicar
      </h2>
      <p className="text-[15px] text-caliza-apagada">
        Calles sin punto en el mapa. Ábralas para ubicarlas y que aparezcan en
        su territorio.
      </p>
      {sinUbicar.map((territorio) => (
        <div key={territorio.id} className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-caliza-tinta">
            {territorio.nombre}: {cuantas(territorio.calles.length)}
          </h3>
          <ul
            className={LISTA}
            aria-label={`Calles sin ubicar en ${territorio.nombre}`}
          >
            {territorio.calles.map((calle) => (
              <li key={calle.id} className={FILA}>
                <Link href={calle.href} className={CLASES_DE_ENLACE}>
                  {calle.nombre}
                </Link>
                <span className="text-caliza-apagada">Ubicar en el mapa</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
