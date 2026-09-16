import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import type { CalleId, LugarId } from "../domain";
import type {
  AccionDeNodo,
  CuentasDeLugar,
  NodoSeleccionado,
  TabDeLugar,
} from "./PanelDeNodo";
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
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "lugarId" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  domicilios: readonly DomicilioParaListado[];
  calleId: CalleId | undefined;
  accion: AccionDeNodo | undefined;
  permisos: PermisosDeTerritorio;
};

/** La ruta del lugar actual con pestana y accion opcionales. */
export const rutaDe = ({
  raizId,
  nodoId,
  vista,
  accion,
  calleId,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  vista: TabDeLugar;
  accion?: AccionDeNodo;
  calleId?: CalleId;
}) =>
  `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=${vista}${
    accion ? `&accion=${accion}` : ""
  }${calleId ? `&calle=${calleId}` : ""}`;

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

/**
 * Lo que cada pestana va a mostrar, contado una vez para escribirlo en la
 * pestana misma. Se cuenta aca —y no adentro de cada pestana— porque las
 * cuatro tienen que verse a la vez en la cabecera, y una pestana solo sabe
 * de lo suyo.
 *
 * Las calles se cuentan siempre: la pestana lista el catalogo que el lugar
 * puede usar, aunque el catalogo sea de su asentamiento.
 */
export const cuentasDeLugar = ({
  nodos,
  domicilios,
  calles,
  nodo,
}: {
  nodos: readonly NodoDeSubarbol[];
  domicilios: readonly DomicilioParaListado[];
  calles: readonly Pick<CalleGuardada, "id">[];
  nodo: NodoSeleccionado;
}): CuentasDeLugar => {
  const idsDeDomicilios = new Set(
    nodos
      .filter((n) => n.clase === "domicilio" && n.lugarId === nodo.id)
      .map((n) => n.id),
  );

  return {
    lugares: nodos.filter((n) => n.clase === "lugar" && n.padreId === nodo.id)
      .length,
    calles: calles.length,
    domicilios: domicilios.filter((d) => idsDeDomicilios.has(d.id)).length,
  };
};
