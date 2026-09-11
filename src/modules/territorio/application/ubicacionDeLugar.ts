import type { ContextoActual } from "@/shared/auth/contexto";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import { type CalleId, componerUbicacion, type LugarId } from "../domain";
import type { LectorDeUbicaciones } from "./puertosDeDirecciones";

export type EntradaDeUbicacion = {
  lugarId: LugarId;
  calleId: CalleId | null;
};

export function crearUbicacionDeLugarEnTransaccion(
  lector: LectorDeUbicaciones,
) {
  return async function ubicacionDeLugarEnTransaccion(
    tx: TransaccionTenant,
    entrada: EntradaDeUbicacion,
  ): Promise<{ texto: string } | null> {
    const partes = await lector.partesDe(tx, entrada.lugarId, entrada.calleId);
    return partes === null ? null : { texto: componerUbicacion(partes) };
  };
}

/**
 * Una sola pregunta, un solo caso de uso, mismo corte que
 * `direccionVigenteDePersona` (design.md seccion 9): "cual es la ubicacion
 * de este lugar y esta calle, como texto". Sin guarda de rol propia -la
 * autorizacion la decide el consumidor, mismo criterio que `personaPorId`-.
 *
 * Devuelve `null` y no lanza: los cuatro casos -lugar inexistente, lugar
 * dado de baja, calle inexistente, cualquiera de los dos de otro tenant-
 * colapsan al mismo `null`. Quien decide que eso es `UbicacionInvalidaError`
 * es `reportes`, no `territorio`.
 */
export function crearUbicacionDeLugar(lector: LectorDeUbicaciones) {
  const leerEnTransaccion = crearUbicacionDeLugarEnTransaccion(lector);

  return function ubicacionDeLugar(
    entrada: EntradaDeUbicacion,
    contexto: ContextoActual,
  ): Promise<{ texto: string } | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      leerEnTransaccion(tx, entrada),
    );
  };
}
