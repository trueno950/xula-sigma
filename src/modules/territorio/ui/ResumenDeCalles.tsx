import { ChipDeFiltro } from "@/shared/ui";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";

const enPlural = (cuantos: number) => (cuantos === 1 ? "calle" : "calles");

/**
 * La linea de S4 de `odd/tasks/territorio-ux.md`: cuantas calles hay, o
 * cuantas coincidieron con el `?q=` puesto, y el chip que lo quita.
 *
 * La pestana sigue diciendo el total del asentamiento -6 aunque la busqueda
 * deje 2-: son dos preguntas distintas. Los chips viven aca y no en
 * `BuscadorDeLaPestana` porque son la otra mitad de la misma frase, mismo
 * corte que `ResumenDeDomicilios`.
 */
export function ResumenDeCalles({
  raizId,
  nodoId,
  coincidencias,
  busqueda,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  coincidencias: number;
  busqueda: string | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[15px] text-caliza-tinta">
        <span className="font-mono font-semibold tabular-nums">
          {coincidencias}
        </span>{" "}
        {enPlural(coincidencias)}
        {busqueda ? ` para «${busqueda}»` : null}
      </p>
      {busqueda ? (
        <ChipDeFiltro
          etiqueta={`Búsqueda: ${busqueda}`}
          hrefQuitar={rutaDe({ raizId, nodoId, vista: "calles" })}
        />
      ) : null}
    </div>
  );
}
