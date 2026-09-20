import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import type { CalleId, DomicilioId, LugarId } from "../domain";
import { descendientesDe } from "./conteo";
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
 *
 * Sin el listado plano del municipio: `page.tsx` dejo de cargarlo
 * (A1b-GREEN-03) y la direccion de cada domicilio sale del nodo del
 * subarbol, que la lleva (`puertos.ts`, `NodoDeSubarbol`).
 */
export type PropsDeContenido = {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  nodos: readonly NodoDeSubarbol[];
  calles: readonly Pick<CalleGuardada, "id" | "nombre" | "lugarId" | "punto">[];
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
  calleId: CalleId | undefined;
  /** El domicilio seleccionado, si `?domicilio=` esta puesto y es del nodo. */
  domicilio: DomicilioGuardado | undefined;
  domicilioId: DomicilioId | undefined;
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
  domicilioId,
}: {
  raizId: LugarId;
  nodoId: LugarId;
  vista: TabDeLugar;
  accion?: AccionDeNodo;
  calleId?: CalleId;
  domicilioId?: DomicilioId;
}) =>
  `/territorio?raiz=${raizId}&nodo=${nodoId}&vista=${vista}${
    accion ? `&accion=${accion}` : ""
  }${calleId ? `&calle=${calleId}` : ""}${
    domicilioId ? `&domicilio=${domicilioId}` : ""
  }`;

export const hijosDirectosDe = (
  nodos: readonly NodoDeSubarbol[],
  lugarId: LugarId,
) =>
  nodos.filter(
    (nodo): nodo is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
      nodo.clase === "lugar" && nodo.padreId === lugarId,
  );

/** El nodo de un domicilio: el subarbol le da la direccion ya resuelta. */
export type NodoDomicilio = Extract<NodoDeSubarbol, { clase: "domicilio" }>;

export const domiciliosDirectosDe = (
  nodos: readonly NodoDeSubarbol[],
  lugarId: LugarId,
): readonly NodoDomicilio[] =>
  nodos.filter(
    (nodo): nodo is NodoDomicilio =>
      nodo.clase === "domicilio" && nodo.lugarId === lugarId,
  );

/**
 * Las otras direcciones vivas con la misma calle y el mismo numero, dentro
 * del subarbol que la pantalla ya trae. Compara `calleId`, no el nombre:
 * dos calles del mismo nombre no son la misma calle
 * (`puertosDeDomicilios.ts`, `DomicilioParaListado.calleId`).
 *
 * Acotado al subarbol y no al municipio entero: todo domicilio de una calle
 * cuelga del subarbol del asentamiento de esa calle, porque la cadena de
 * `lugarId` sube hasta el lugar que tiene catalogo de calles y las tres
 * calles tienen que ser de ese lugar (`verificacionDeDomicilio.ts`,
 * `exigirCallesDelAsentamiento`). Sin numero no hay direccion que comparar.
 */
export const hermanosDeDireccion = (
  nodos: readonly NodoDeSubarbol[],
  domicilio: Pick<DomicilioGuardado, "id" | "calleId" | "numero">,
): readonly NodoDomicilio[] =>
  domicilio.numero === null
    ? []
    : nodos.filter(
        (nodo): nodo is NodoDomicilio =>
          nodo.clase === "domicilio" &&
          nodo.id !== domicilio.id &&
          nodo.calleId === domicilio.calleId &&
          nodo.numero === domicilio.numero,
      );

/**
 * Lo que cada pestana va a mostrar, contado una vez para escribirlo en la
 * pestana misma. Se cuenta aca —y no adentro de cada pestana— porque las
 * cuatro tienen que verse a la vez en la cabecera, y una pestana solo sabe
 * de lo suyo.
 *
 * Domicilios: coexiste con `domiciliosDirectosDe`, que contesta otra
 * pregunta -que filas lista la pestana- y por eso `TabDeDomicilios` la
 * sigue usando en vez de esta.
 *
 * Calles: solo las que el nodo tiene por suyas (`lugarId === nodo.id`). La
 * pestana sigue listando el catalogo heredado del asentamiento -de solo
 * lectura, para que un domicilio se cree contra una calle suya-, pero el
 * numero de la pestana dice "calles de este nodo", no "catalogo que puede
 * usar" (`TabDeCalles.tsx` explica ese listado). Antes contaba el catalogo
 * entero y todos los nodos mostraban el mismo numero.
 */
export const cuentasDeLugar = ({
  nodos,
  calles,
  nodo,
}: {
  nodos: readonly NodoDeSubarbol[];
  calles: readonly Pick<CalleGuardada, "id" | "lugarId">[];
  nodo: NodoSeleccionado;
}): CuentasDeLugar => {
  const lugares = nodos.filter(
    (n): n is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
      n.clase === "lugar",
  );
  const bajo = new Set<string>([
    nodo.id,
    ...descendientesDe([nodo.id], lugares),
  ]);

  return {
    lugares: lugares.filter((n) => n.padreId === nodo.id).length,
    calles: calles.filter((calle) => calle.lugarId === nodo.id).length,
    domicilios: nodos.filter(
      (n): n is NodoDomicilio => n.clase === "domicilio" && bajo.has(n.lugarId),
    ).length,
  };
};
