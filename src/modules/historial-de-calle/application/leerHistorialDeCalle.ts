import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CalleId,
  componerHistorialDeCalle,
  type HistorialDeCalle,
} from "../domain";
import type { FuentesDeHistorial } from "./puertos";

export function crearLeerHistorialDeCalle(fuentes: FuentesDeHistorial) {
  return async function leerHistorialDeCalle(
    calleId: CalleId,
    contexto: ContextoActual,
  ): Promise<HistorialDeCalle | null> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const calle = await fuentes.callePorId(tx, calleId);
      if (!calle) return null;

      const [reportes, intervenciones] = await Promise.all([
        fuentes.reportesPorCalle(tx, calleId),
        fuentes.intervencionesPorCalle(tx, calleId),
      ]);

      return componerHistorialDeCalle({
        calleId,
        eventos: calle,
        reportes,
        intervenciones,
      });
    });
  };
}
