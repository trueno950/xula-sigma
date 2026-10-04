import { Pestanas } from "@/shared/ui";
import type { LugarId, TipoDeLugar } from "../domain";
import { pestanasDePanel } from "./vistaDePanel";

/**
 * `tipo` es `TipoDeLugar` y no `string`: los dos origenes que lo arman
 * -`lugarPorId` y el subarbol- ya lo tienen tipado, y ensancharlo aca
 * dejaba a la pestana Lugares sin poder preguntar que puede contener.
 */
export type NodoSeleccionado = {
  id: LugarId;
  tipo: TipoDeLugar;
  nombre: string;
};

/** Un paso de la migaja: la raiz, un ancestro, o el nodo mismo. */
export type PasoDeMigaja = { id: LugarId; nombre: string };

export type { AccionDeNodo } from "./acciones";

/** La pestana que categoriza el contenido: una sola se ve a la vez. */
export type TabDeLugar = "lugares" | "calles" | "domicilios" | "editar";

/** Cuantos hay adentro de cada categoria, para escribirlo en la pestana. */
export type CuentasDeLugar = {
  lugares: number;
  calles: number;
  domicilios: number;
};

type Props = {
  raizId: LugarId;
  nodo: NodoSeleccionado;
  /** La pestana activa: la unica categoria visible. */
  vista: TabDeLugar;
  cuentas: CuentasDeLugar;
  /**
   * Si queda al menos una accion de Editar para este rol. Llega calculado
   * -`permisosDeTerritorio` en `permisos.ts`- y no como rol, para que este
   * componente no vuelva a decidir permisos por su cuenta.
   */
  abreLaEdicion: boolean;
};

/**
 * Las pestanas del lugar actual. El nombre y la migaja ya no viven aca: son
 * el titulo y la ruta de la pagina (`PaginaDePanel`), y repetirlos en un
 * segundo encabezado dejaba dos "Colonia Centro" una sobre otra.
 *
 * Las pestanas llevan la cuenta de lo que tienen adentro, y eso es lo que
 * las vuelve una respuesta en vez de una pregunta: sin el numero, saber si
 * un lugar tiene calles cargadas obligaba a entrar a la pestana, y despues
 * volver. "Editar" no lleva cuenta a proposito: no es una categoria de
 * contenido, es lo que se le hace al lugar mismo.
 */
export function PanelDeNodo({
  raizId,
  nodo,
  vista,
  cuentas,
  abreLaEdicion,
}: Props) {
  const pestanas = pestanasDePanel({
    raizId,
    nodoId: nodo.id,
    vista,
    cuentas,
    abreLaEdicion,
  });

  return <Pestanas pestanas={pestanas} etiqueta="Contenido del lugar" />;
}
