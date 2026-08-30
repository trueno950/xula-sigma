import { comoPersonaId, personaPorId } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LecturaDeTitulares } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeTitulares` contra el caso de uso de
 * `padron`, no contra su repositorio: `personas` es inalcanzable fuera de
 * `padron` (design.md de `constancias-oficios`, seccion 2), asi que este
 * adaptador es uno de los dos unicos archivos del modulo que pueden cruzar
 * el limite -importando `PersonaId`/`comoPersonaId` de `padron`-, y lo hace
 * por el barrel. El puerto trabaja con `string`; `comoPersonaId` convierte
 * en esta unica frontera, justo antes de llamar a la funcion tipada de
 * `padron`. `personaPorId` abre su propio `withTenant` -el de `padron`-,
 * nunca el de `constancias`.
 */
export const crearLectorDeTitularesPorPadron = (
  contexto: ContextoActual,
): LecturaDeTitulares => ({
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
