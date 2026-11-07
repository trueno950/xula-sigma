import type {
  CalleGuardada,
  LugarGuardado,
  NodoDeSubarbol,
} from "../application/puertos";
import type { DomicilioGuardado } from "../application/puertosDeDomicilios";
import { calleYNumero, type LugarId } from "../domain";
import type { AccionDeNodo } from "./PanelDeNodo";
import { type PermisosDeTerritorio, puedeAbrir } from "./permisos";
import { lugaresDeNodos } from "./vistaDeDomicilios";
import { type NivelDelFormulario, zonaConInicial } from "./zonaDelFormulario";

/** El `id` de la vista de correccion; el enlace del panel lo lleva de fragmento. */
export const ANCLA_DE_CORRECCION = "panel-de-correccion";

/**
 * La correccion ocupa la pestana entera solo si hay domicilio y el rol
 * puede corregir: con `?accion=corregirDomicilio` y un rol de consulta la
 * pestana sigue mostrando la lista y el panel.
 */
export const abreLaCorreccion = (
  accion: AccionDeNodo | undefined,
  domicilio: DomicilioGuardado | undefined,
  permisos: PermisosDeTerritorio,
): domicilio is DomicilioGuardado =>
  accion === "corregirDomicilio" &&
  domicilio !== undefined &&
  puedeAbrir("corregirDomicilio", permisos);

export const direccionDeDomicilio = (
  domicilio: DomicilioGuardado,
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[],
): string =>
  calleYNumero({
    calle:
      calles.find((posible) => posible.id === domicilio.calleId)?.nombre ??
      "Calle desconocida",
    numero: domicilio.numero,
  });

/** El nivel de Colonia con el que abre la correccion: la zona guardada. */
export const zonaDeCorreccion = ({
  raizId,
  domicilio,
  lugares,
  nodos,
}: {
  raizId: LugarId;
  domicilio: DomicilioGuardado;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre">[];
  nodos: readonly NodoDeSubarbol[];
}): NivelDelFormulario => {
  const asentamiento = lugares.find((posible) => posible.id === raizId);

  return zonaConInicial(
    lugaresDeNodos(nodos),
    asentamiento ? { id: raizId, nombre: asentamiento.nombre } : undefined,
    domicilio.lugarId,
  );
};
