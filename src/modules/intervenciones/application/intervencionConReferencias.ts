import type { ContextoActual } from "@/shared/auth/contexto";
import type { IntervencionId } from "../domain";
import type { IntervencionGuardada } from "./puertos";
import type {
  LectorDeReferencias,
  ReferenciasDeIntervencion,
} from "./puertosDeLectura";

export type IntervencionConReferencias = {
  intervencion: IntervencionGuardada;
  referencias: ReferenciasDeIntervencion;
};

/**
 * Sin guarda de rol, igual que `intervencionPorId`: leer no es escribir. Una
 * intervencion invisible por tenant es `null` y no se lee ninguna de sus
 * referencias: no hay ids ajenos que resolver.
 */
export function crearIntervencionConReferencias(
  buscar: (
    id: IntervencionId,
    contexto: ContextoActual,
  ) => Promise<IntervencionGuardada | null>,
  lector: LectorDeReferencias,
) {
  return async function intervencionConReferencias(
    id: IntervencionId,
    contexto: ContextoActual,
  ): Promise<IntervencionConReferencias | null> {
    const intervencion = await buscar(id, contexto);
    if (!intervencion) return null;

    const referencias = await lector.leer(contexto, {
      lugarId: intervencion.lugarId,
      calleId: intervencion.calleId,
      reporteId: intervencion.reporteId,
    });

    return { intervencion, referencias };
  };
}
