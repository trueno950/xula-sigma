import { direccionVigenteDePersona } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LecturaDeDirecciones } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeDirecciones` contra el caso de uso de
 * `territorio`, mismo criterio y mismo motivo que
 * `lectorDeTitularesPorPadron.ts`: `direccionVigenteDePersona` ya trabaja
 * con `string` de su lado (design.md de `constancias-oficios`, seccion 3
 * -la asimetria del `ResidenciaId` asignable a `string` sin cast-), asi que
 * aca no hace falta ninguna conversion. Abre su propio `withTenant` -el de
 * `territorio`-, nunca el de `constancias`.
 */
export const crearLectorDeDireccionesPorTerritorio = (
  contexto: ContextoActual,
): LecturaDeDirecciones => ({
  async vigenteDe(personaId) {
    const direccion = await direccionVigenteDePersona(personaId, contexto);
    if (!direccion) return null;

    return {
      texto: direccion.texto,
      residenciaId: direccion.residenciaId,
      desdeEn: direccion.desdeEn,
    };
  },
});
