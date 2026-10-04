import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import { puedeTenerCatalogoDeCalles } from "../domain";
import type {
  ConteoDeLugar,
  LectorDeContenidoDeLugares,
} from "./puertosDeContenidoDeLugares";

/**
 * Sin guarda de rol a proposito, mismo criterio que `listarLugares`: contar
 * lo que ya se puede listar no es escribirlo. Las calles solo se informan
 * donde el dominio dice que hay catalogo propio.
 */
export function crearContarContenidoDeLugares(
  lector: LectorDeContenidoDeLugares,
) {
  return async function contarContenidoDeLugares(
    contexto: ContextoActual,
  ): Promise<readonly ConteoDeLugar[]> {
    const filas = await withTenant(contexto.ayuntamientoId, (tx) =>
      lector.contarPorLugar(tx),
    );

    return filas.map(({ lugarId, tipo, domicilios, calles }) => ({
      lugarId,
      domicilios,
      calles: puedeTenerCatalogoDeCalles(tipo) ? calles : null,
    }));
  };
}
