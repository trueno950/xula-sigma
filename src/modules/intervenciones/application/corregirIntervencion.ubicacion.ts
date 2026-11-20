import { NoEncontradoError } from "@/shared/lib/errores";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { CalleFueraDelLugarError, comoIntervencionId } from "../domain";
import type { IntervencionGuardada } from "./puertos";
import type { LecturaDeUbicaciones } from "./puertosDeLectura";

type UbicacionDeLaCorreccion = {
  id: string;
  lugarId: string;
  calleId: string | null;
};

type BuscarPorId = (
  tx: TransaccionTenant,
  id: ReturnType<typeof comoIntervencionId>,
) => Promise<IntervencionGuardada | null>;

export type DependenciasDeCalleDelLugar = {
  tx: TransaccionTenant;
  entrada: UbicacionDeLaCorreccion;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
  /** La pareja guardada, para la excepcion de la fila que quedo incoherente. */
  buscarPorId?: BuscarPorId | undefined;
};

const esLaParejaGuardada = async ({
  tx,
  entrada,
  buscarPorId,
}: DependenciasDeCalleDelLugar): Promise<boolean> => {
  if (!buscarPorId) return false;

  const guardada = await buscarPorId(tx, comoIntervencionId(entrada.id));

  return (
    guardada !== null &&
    guardada.lugarId === entrada.lugarId &&
    guardada.calleId === entrada.calleId
  );
};

/**
 * La calle tiene que colgar del asentamiento del lugar (S6 de
 * `intervenciones-ux`), con una excepcion: si la pareja guardada ya es
 * exactamente la que se esta enviando, se deja pasar.
 *
 * Esa excepcion es la que sostiene `reparentearLugar`, que mueve una colonia
 * con intervenciones escritas: la pareja deja de ser coherente sin dejar de
 * existir, y sin esto esa fila quedaria imposible de corregir. La fila guardada
 * se lee solo en ese camino -el de la calle ajena-, no en el comun: una calle
 * del asentamiento del lugar se acepta sin leer nada mas. Un lector que no
 * implementa el veredicto no puede aceptar una calle.
 */
export const exigirCalleDelLugar = async (
  dependencias: DependenciasDeCalleDelLugar,
): Promise<void> => {
  const { tx, entrada } = dependencias;
  if (entrada.calleId === null) return;

  const calle = await dependencias
    .crearLecturaDeUbicaciones()
    .calleDelLugar?.(tx, entrada.lugarId, entrada.calleId);
  if (calle === "del-lugar") return;
  if (calle !== "fuera-del-lugar") throw new NoEncontradoError();

  if (await esLaParejaGuardada(dependencias)) return;

  throw new CalleFueraDelLugarError();
};
