import {
  comoCalleId,
  comoLugarId,
  ubicacionDeLugarEnTransaccion,
} from "@/modules/territorio";
import type { LecturaDeUbicaciones } from "../application/puertosDeLectura";

export const crearLectorDeUbicacionesPorTerritorio =
  (): LecturaDeUbicaciones => ({
    async de(tx, lugarId, calleId) {
      return ubicacionDeLugarEnTransaccion(tx, {
        lugarId: comoLugarId(lugarId),
        calleId: calleId === null ? null : comoCalleId(calleId),
      });
    },
  });
