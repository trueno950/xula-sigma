import {
  comoCalleId,
  comoLugarId,
  ubicacionDeLugar,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LecturaDeUbicaciones } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeUbicaciones` contra el caso de uso de
 * `territorio`, no contra su repositorio: `lugares` y `calles` son
 * inalcanzables fuera de `territorio` (design.md seccion 6), asi que este
 * adaptador es uno de los dos unicos archivos del modulo que cruzan el
 * limite -importando `LugarId`/`CalleId` de `territorio`- y lo hace por el
 * barrel. El puerto trabaja con `string`; `comoLugarId`/`comoCalleId`
 * convierten en esta unica frontera, justo antes de llamar a la funcion
 * tipada. `ubicacionDeLugar` abre su propio `withTenant` -el de
 * `territorio`-, nunca el de `reportes`.
 */
export const crearLectorDeUbicacionesPorTerritorio = (
  contexto: ContextoActual,
): LecturaDeUbicaciones => ({
  async de(lugarId, calleId) {
    return ubicacionDeLugar(
      {
        lugarId: comoLugarId(lugarId),
        calleId: calleId === null ? null : comoCalleId(calleId),
      },
      contexto,
    );
  },
});
