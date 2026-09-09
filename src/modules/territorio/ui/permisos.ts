import {
  puedeAdministrarTerritorio,
  puedeEscribir,
  type Rol,
} from "@/shared/auth/roles";
import type { AccionDeNodo } from "./PanelDeNodo";

/**
 * Que predicado exige cada accion del nodo.
 *
 * Es la misma pareja que vuelve a aplicar cada caso de uso -`altaDeCalle`,
 * `renombrarCalle` y `reparentearLugar` piden
 * `puedeAdministrarTerritorio`; el resto, `puedeEscribir`-, y ese es todo
 * el punto: la pantalla no decide nada, repite la condicion para no
 * ofrecer un camino que termina en `NoAutorizadoError` despues de enviar.
 *
 * Escrita como `Record` completo a proposito: agregar una accion a
 * `AccionDeNodo` sin clasificarla no compila.
 */
const EXIGE: Record<AccionDeNodo, (rol: Rol) => boolean> = {
  lugar: puedeEscribir,
  domicilio: puedeEscribir,
  renombrar: puedeEscribir,
  baja: puedeEscribir,
  calle: puedeAdministrarTerritorio,
  ubicarCalle: puedeAdministrarTerritorio,
  reparentearCalle: puedeAdministrarTerritorio,
  bajaCalle: puedeAdministrarTerritorio,
  renombrarCalle: puedeAdministrarTerritorio,
  reparentear: puedeAdministrarTerritorio,
};

/** Las tres que viven en la pestana Editar, y que deciden si se muestra. */
const DE_LA_EDICION: readonly AccionDeNodo[] = [
  "renombrar",
  "reparentear",
  "baja",
];

export type PermisosDeTerritorio = {
  readonly porAccion: Readonly<Record<AccionDeNodo, boolean>>;
  /** Si queda al menos una accion de Editar, la pestana tiene sentido. */
  readonly abreLaEdicion: boolean;
};

export function permisosDeTerritorio(rol: Rol): PermisosDeTerritorio {
  const porAccion = Object.fromEntries(
    Object.entries(EXIGE).map(([accion, exige]) => [accion, exige(rol)]),
  ) as Record<AccionDeNodo, boolean>;

  return {
    porAccion,
    abreLaEdicion: DE_LA_EDICION.some((accion) => porAccion[accion]),
  };
}

export const puedeAbrir = (
  accion: AccionDeNodo,
  permisos: PermisosDeTerritorio,
) => permisos.porAccion[accion];
