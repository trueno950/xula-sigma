import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import type {
  DomicilioDelRegistro,
  DomicilioGuardado,
} from "../application/puertosDeDomicilios";
import type { ResidenteDeDomicilio } from "../application/puertosDeResidencias";
import {
  type CalleId,
  type DomicilioId,
  type LugarId,
  puedeTenerCatalogoDeCalles,
} from "../domain";
import type { BorradorDeDomicilio } from "./borradorDeDomicilio";
import type {
  AccionDeNodo,
  CuentasDeLugar,
  NodoSeleccionado,
  TabDeLugar,
} from "./PanelDeNodo";
import type { PermisosDeTerritorio } from "./permisos";

/**
 * Lo que las cuatro pestanas comparten: su forma de props, la ruta que las
 * enlaza y las cuentas de la cabecera.
 *
 * Vive en su propio archivo y no en el que las re-exporta porque eso era un
 * ciclo: cada pestana importaba los ayudantes de `TabsDeLugar` y
 * `TabsDeLugar` importaba cada pestana para reexportarla. `sin-ciclos` de
 * `.dependency-cruiser.cjs` lo agarro en el primer `pnpm check`.
 *
 * `nodos` trae solo lugares: los domicilios llegan paginados en
 * `domicilios`, y solo cuando la pestana Domicilios se muestra.
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
  /** Las cuentas por lugar del municipio: las filas de la pestana Lugares. */
  conteos?: readonly ConteoDeLugar[] | undefined;
  /** Quien vive en `domicilio`; se lee solo cuando hay uno abierto. */
  residentes?: readonly ResidenteDeDomicilio[] | undefined;
  /** Lo capturado en un formulario rechazado; ver `borradorEnCookie.ts`. */
  borrador?: BorradorDeDomicilio | null | undefined;
  /** La pagina de la pestana Domicilios, leida solo cuando se muestra. */
  domicilios?: PaginaDeDomicilios | undefined;
  /** Los vivos con la calle y el numero de `domicilio`, el mismo incluido. */
  mismaDireccion?: readonly DomicilioDeLaPestana[] | undefined;
  /** El `?q=` de Calles y Domicilios. */
  busqueda?: string | undefined;
  /** El `?limite=` vigente de Calles y Domicilios. */
  limite?: number | undefined;
};

/** Una fila de la pestana Domicilios, con su calle y su lugar ya resueltos. */
export type DomicilioDeLaPestana = Pick<
  DomicilioDelRegistro,
  "id" | "lugarId" | "lugar" | "calleId" | "calle" | "numero"
>;

export type PaginaDeDomicilios = {
  readonly filas: readonly DomicilioDeLaPestana[];
  readonly hayMas: boolean;
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

/**
 * Las otras direcciones vivas con la misma calle y el mismo numero. Compara
 * `calleId`, no el nombre: dos calles del mismo nombre no son la misma
 * calle (`puertosDeDomicilios.ts`, `DomicilioParaListado.calleId`).
 *
 * Los candidatos los lee la pagina en el subarbol del asentamiento y no en
 * el municipio entero: todo domicilio de una calle cuelga del subarbol del
 * asentamiento de esa calle, porque la cadena de `lugarId` sube hasta el
 * lugar que tiene catalogo de calles y las tres calles tienen que ser de
 * ese lugar (`verificacionDeDomicilio.ts`, `exigirCallesDelAsentamiento`).
 * Sin numero no hay direccion que comparar.
 */
export const hermanosDeDireccion = <
  C extends Pick<DomicilioDeLaPestana, "id" | "calleId" | "numero">,
>(
  candidatos: readonly C[],
  domicilio: Pick<DomicilioGuardado, "id" | "calleId" | "numero">,
): readonly C[] =>
  domicilio.numero === null
    ? []
    : candidatos.filter(
        (candidato) =>
          candidato.id !== domicilio.id &&
          candidato.calleId === domicilio.calleId &&
          candidato.numero === domicilio.numero,
      );

/**
 * Lo que cada pestana va a mostrar, contado una vez para escribirlo en la
 * pestana misma. Se cuenta aca —y no adentro de cada pestana— porque las
 * cuatro tienen que verse a la vez en la cabecera, y una pestana solo sabe
 * de lo suyo.
 *
 * Domicilios: los del subarbol del lugar, que cuenta la misma consulta
 * agrupada de las filas de Lugares (`contarContenidoDeLugares`) y que es lo
 * que pagina `TabDeDomicilios`. Si esa consulta fallo no hay cuenta: un 0
 * diria que el lugar esta vacio.
 *
 * Calles: lo que la pestana lista. Un lugar con catalogo cuenta las suyas;
 * una colonia lista el catalogo heredado de su asentamiento
 * (`CatalogoHeredado`) y cuenta ese, porque un 0 sobre una tabla con filas
 * era una contradiccion en la misma pantalla.
 */
export const cuentasDeLugar = ({
  nodos,
  calles,
  nodo,
  conteos,
}: {
  nodos: readonly NodoDeSubarbol[];
  calles: readonly Pick<CalleGuardada, "id" | "lugarId">[];
  nodo: NodoSeleccionado;
  conteos?: readonly ConteoDeLugar[] | undefined;
}): CuentasDeLugar => {
  const lugares = nodos.filter(
    (n): n is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
      n.clase === "lugar",
  );

  return {
    lugares: lugares.filter((n) => n.padreId === nodo.id).length,
    calles: puedeTenerCatalogoDeCalles(nodo.tipo)
      ? calles.filter((calle) => calle.lugarId === nodo.id).length
      : calles.length,
    domicilios: conteos?.find((cuenta) => cuenta.lugarId === nodo.id)
      ?.domicilios,
  };
};
