import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import type { LugarId } from "../domain";
import type { AccionDeNodo, NodoSeleccionado, TabDeLugar } from "./PanelDeNodo";
import type { PermisosDeTerritorio } from "./permisos";

/**
 * Lo que las cuatro pestanas comparten: su forma de props, la ruta que las
 * enlaza y los dos filtros del subarbol.
 *
 * Vive en su propio archivo y no en el que las re-exporta porque eso era un
 * ciclo: cada pestana importaba los ayudantes de `TabsDeLugar` y
 * `TabsDeLugar` importaba cada pestana para reexportarla. `sin-ciclos` de
 * `.dependency-cruiser.cjs` lo agarro en el primer `pnpm check`.
 */
export type PropsDeContenido = {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  nodos: readonly NodoDeSubarbol[];
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  domicilios: readonly DomicilioParaListado[];
  accion: AccionDeNodo | undefined;
  permisos: PermisosDeTerritorio;
};

/** La ruta del lugar actual con pestana y accion opcionales. */
export const rutaDe = ({
  raizId,
  nodoId,
  vista,
  accion,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  vista: TabDeLugar;
  accion?: AccionDeNodo;
}) =>
  `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=${vista}${
    accion ? `&accion=${accion}` : ""
  }`;

export const hijosDirectosDe = (
  nodos: readonly NodoDeSubarbol[],
  lugarId: LugarId,
) =>
  nodos.filter(
    (nodo): nodo is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
      nodo.clase === "lugar" && nodo.padreId === lugarId,
  );

export const domiciliosDirectosDe = (
  nodos: readonly NodoDeSubarbol[],
  domicilios: readonly DomicilioParaListado[],
  lugarId: LugarId,
): DomicilioParaListado[] => {
  const ids = new Set(
    nodos
      .filter((nodo) => nodo.clase === "domicilio" && nodo.lugarId === lugarId)
      .map((nodo) => nodo.id),
  );

  return domicilios.filter((domicilio) => ids.has(domicilio.id));
};
