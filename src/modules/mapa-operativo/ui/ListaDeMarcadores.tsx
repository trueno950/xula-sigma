import Link from "next/link";
import { CLASES_DE_ENLACE } from "@/shared/ui";
import type { MarcadorDeMapa } from "../domain";
import { etiquetaDeRecurso } from "./etiquetasDeRecurso";
import { IconoDeMapa } from "./IconoDeMapa";

const LISTA =
  "divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo";
const FILA = "flex flex-col gap-1 px-5 py-2 text-[15px]";
const DETALLE = "text-caliza-apagada";

/**
 * S5: el camino sin JavaScript sigue siendo esta lista, y ahora dice lo mismo
 * que el mapa: un pin por calle, con cuantos hechos lleva adentro y cuales
 * son. Es tambien la alternativa para quien no puede usar el mapa.
 */
export function ListaDeMarcadores({
  marcadores,
}: {
  marcadores: readonly MarcadorDeMapa[];
}) {
  return (
    <ul className={LISTA} aria-label="Marcadores del mapa">
      {marcadores.map((marcador) => (
        <li key={marcador.clave} className={FILA}>
          <div className="flex items-center gap-2">
            <IconoDeMapa clave={marcador.icono} tamano={20} />
            {marcador.hechos.length > 1 ? (
              <span className="font-semibold text-caliza-tinta">
                {marcador.hechos.length} hechos en esta calle
              </span>
            ) : null}
          </div>
          <ul className="flex flex-col gap-1">
            {marcador.hechos.map((hecho) => (
              <li key={hecho.id}>
                <Link href={hecho.href} className={CLASES_DE_ENLACE}>
                  {etiquetaDeRecurso(hecho.recurso, "lista")}: {hecho.etiqueta}
                </Link>{" "}
                <span className={DETALLE}>
                  {hecho.etiquetaDeTipo} · {hecho.etiquetaDeEstado}
                </span>
              </li>
            ))}
          </ul>
          {marcador.historiaHref ? (
            <Link href={marcador.historiaHref} className={CLASES_DE_ENLACE}>
              Ver historial de calle
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
