import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type ConteosDeIntervenciones,
  componerConteosDeIntervenciones,
} from "../domain";
import type {
  ContadorDeIntervenciones,
  FiltrosDeIntervenciones,
} from "./puertosDeLectura";

/**
 * Los conteos por estado del tablero de `intervenciones-ux` S2, con los
 * filtros elegidos.
 *
 * Sin guarda de rol propia, mismo criterio que `listarIntervenciones`: contar
 * lo que ya se puede listar no es administrar, y RLS acota el `GROUP BY` al
 * municipio de la transaccion. La pantalla la llama con los filtros **sin el
 * estado**, para que cada columna diga cuantas obras tiene con lo que ya esta
 * filtrado y no con la columna que se esta mirando.
 */
export function crearContarIntervenciones(contador: ContadorDeIntervenciones) {
  return async function contarIntervenciones(
    filtros: FiltrosDeIntervenciones,
    contexto: ContextoActual,
  ): Promise<ConteosDeIntervenciones> {
    const filas = await withTenant(contexto.ayuntamientoId, (tx) =>
      contador.contar(tx, filtros),
    );

    return componerConteosDeIntervenciones(filas);
  };
}
