import {
  calleDelLugar,
  comoCalleId,
  comoLugarId,
  ubicacionDeLugarEnTransaccion,
} from "@/modules/territorio";
import type { LecturaDeUbicaciones } from "../application/puertosDeLectura";

/**
 * Implementacion real de `LecturaDeUbicaciones` contra `territorio`. Las dos
 * lecturas cruzan el limite por el barrel del modulo y convierten a los ids
 * tipados en esta unica frontera, justo antes de llamar a la funcion tipada.
 *
 * `ubicacionDeLugarEnTransaccion` compone el texto de la ubicacion y
 * `calleDelLugar` responde el veredicto de coherencia (S6 de
 * `intervenciones-ux`): son dos preguntas distintas y por eso son dos casos de
 * uso de `territorio`, no uno.
 */
export const crearLectorDeUbicacionesPorTerritorio =
  (): LecturaDeUbicaciones => ({
    async de(tx, lugarId, calleId) {
      return ubicacionDeLugarEnTransaccion(tx, {
        lugarId: comoLugarId(lugarId),
        calleId: calleId === null ? null : comoCalleId(calleId),
      });
    },
    async calleDelLugar(tx, lugarId, calleId) {
      return calleDelLugar(tx, {
        lugarId: comoLugarId(lugarId),
        calleId: comoCalleId(calleId),
      });
    },
  });
