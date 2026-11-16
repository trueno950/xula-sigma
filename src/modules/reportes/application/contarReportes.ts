import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import { type ConteosDeReportes, componerConteos } from "../domain";
import type { RepositorioDeReportes } from "./puertos";
import type { OpcionesDeConteo } from "./puertosDeListado";

/**
 * Los conteos por estado y por area de la bandeja (S2 de
 * `gestion-municipal`), para los filtros elegidos.
 *
 * Sin guarda de rol propia, mismo criterio que `listarReportes`: contar lo
 * que ya se puede listar no es administrar, y RLS acota el `GROUP BY` al
 * municipio de la transaccion. Recibe los mismos filtros y la misma busqueda
 * que el listado -incluido `lugarIds`, el subarbol que resolvio la pagina-,
 * asi que los numeros y las filas no pueden divergir.
 */
export function crearContarReportes(
  repositorio: Pick<RepositorioDeReportes, "contar">,
) {
  return async function contarReportes(
    opciones: OpcionesDeConteo,
    contexto: ContextoActual,
  ): Promise<ConteosDeReportes> {
    const filas = await withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.contar(tx, opciones),
    );

    return componerConteos(filas);
  };
}
