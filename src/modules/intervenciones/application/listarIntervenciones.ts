import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { IntervencionGuardada } from "./puertos";
import type {
  FiltrosDeIntervenciones,
  LectorDeIntervenciones,
} from "./puertosDeLectura";

/**
 * La bandeja de `/intervenciones` (S1). Sin guarda de rol, mismo criterio que
 * `listarReportes` y `listarCalles`: leer no es escribir. El filtro lo aplica
 * el lector contra las columnas de la tabla -no la pantalla- y la lectura
 * corre siempre bajo el tenant del contexto, asi que un lugar de otro
 * municipio devuelve cero filas en vez de las de ese municipio.
 */
export function crearListarIntervenciones(lector: LectorDeIntervenciones) {
  return function listarIntervenciones(
    filtros: FiltrosDeIntervenciones,
    contexto: ContextoActual,
  ): Promise<readonly IntervencionGuardada[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.listar(tx, filtros),
    );
  };
}
