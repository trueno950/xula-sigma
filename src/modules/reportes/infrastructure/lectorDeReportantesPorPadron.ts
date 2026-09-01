import { comoPersonaId, personaPorId } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LecturaDeReportantes } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeReportantes` contra el caso de uso de
 * `padron`, calco de `constancias/infrastructure/lectorDeTitularesPorPadron.ts`:
 * `personas` es inalcanzable fuera de `padron`, asi que este adaptador cruza
 * el limite por el barrel y convierte a `PersonaId` con `comoPersonaId` en
 * esta unica frontera. `personaPorId` abre su propio `withTenant` -el de
 * `padron`-, nunca el de `reportes`.
 */
export const crearLectorDeReportantesPorPadron = (
  contexto: ContextoActual,
): LecturaDeReportantes => ({
  async porId(personaId) {
    const persona = await personaPorId(comoPersonaId(personaId), contexto);
    if (!persona) return null;

    const nombreCompleto = [
      persona.nombres,
      persona.primerApellido,
      persona.segundoApellido,
    ]
      .filter((parte): parte is string => Boolean(parte))
      .join(" ");

    return { nombreCompleto, bajaEn: persona.bajaEn };
  },
});
