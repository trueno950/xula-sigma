import type { Hecho } from "./filtrarHechos";
import type { CalleParaMapaOperativo } from "./puertos";

export type PuntosPorCalle = ReadonlyMap<string, CalleParaMapaOperativo>;

/**
 * A que territorio pertenece un hecho. Manda el lugar de su calle: el mapa
 * dibuja el punto de la calle, y una calle reparentada deja el hecho donde
 * se ve, no donde lo registraron. Solo un hecho sin calle -o con una calle
 * que ya no se puede leer- se ubica por su propio `lugarId`.
 *
 * Es el criterio que S1 deja abierto y `territorioElegido.test.ts` fija.
 */
export const lugarDelHecho = (hecho: Hecho, puntos: PuntosPorCalle): string =>
  (hecho.calleId === null ? undefined : puntos.get(hecho.calleId)?.lugarId) ??
  hecho.lugarId;

/**
 * `permitidos` en `null` es «todo el municipio»: el `?lugar=` viaja solo
 * cuando la operadora eligio un territorio, y ahi el conjunto trae la raiz y
 * sus descendientes. Un id de otro municipio o inexistente deja un conjunto
 * que no interseca nada: la lista vacia es la respuesta, nunca un hecho
 * ajeno.
 */
export function filtrarPorTerritorio(
  hechos: readonly Hecho[],
  puntos: PuntosPorCalle,
  permitidos: ReadonlySet<string> | null,
): readonly Hecho[] {
  if (!permitidos) return hechos;
  return hechos.filter((hecho) => permitidos.has(lugarDelHecho(hecho, puntos)));
}

/** Las calles que caen dentro del territorio elegido, para calcular su caja. */
export const callesDelTerritorio = (
  calles: readonly CalleParaMapaOperativo[],
  permitidos: ReadonlySet<string> | null,
): readonly CalleParaMapaOperativo[] =>
  permitidos === null
    ? calles
    : calles.filter((calle) => permitidos.has(calle.lugarId));
