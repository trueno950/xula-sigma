import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { CalleGuardada } from "./puertos";
import type { LectorDeCallesDeMapa } from "./puertosDeLecturaDeCalles";

/**
 * Sin guarda de rol a proposito, mismo criterio que `listarCalles`: leer el
 * mapa no es administrar la estructura. La sesion y el tenant los pone el
 * borde; el `ayuntamientoId` sale del contexto del servidor.
 */
export function crearCallesParaMapa(lector: LectorDeCallesDeMapa) {
  return function callesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly CalleGuardada[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.listarParaMapa(tx),
    );
  };
}
