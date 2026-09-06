import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDeConstancias } from "../domain";
import { resolverPagina } from "../domain";
import type {
  FiltrosDeListado,
  RepositorioDeConstancias,
  ResultadoDeListado,
} from "./puertos";

/**
 * Tamano de pagina fijo de `design.md`, seccion "Paginacion": propia y no
 * heredada de configuracion, mismo criterio que `TAMANO_DE_PAGINA` en
 * `reportes` y `padron`.
 */
export const TAMANO_DE_PAGINA = 50;

/**
 * Lista las constancias del ayuntamiento del contexto. Sin guarda de rol
 * propia, mismo criterio que `constanciaPorId`: leer no es escribir y RLS
 * ya acota. Los filtros pasan tal cual al repositorio.
 *
 * Pide `limite + 1` al repositorio y lo recorta con `resolverPagina`
 * (`domain/paginacion.ts`): asi la pantalla sabe si pintar "Ver mas" sin un
 * `COUNT(*)` aparte -mismo mecanismo que `listarReportes`.
 */
export function crearListarConstancias(
  repositorio: Pick<RepositorioDeConstancias, "listar">,
) {
  return function listarConstancias(
    filtros: FiltrosDeListado,
    contexto: ContextoActual,
    opciones?: {
      limite?: number | undefined;
      orden?: OrdenDeConstancias | undefined;
    },
  ): Promise<ResultadoDeListado> {
    const limite = opciones?.limite ?? TAMANO_DE_PAGINA;

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const filas = await repositorio.listar(tx, filtros, {
        limite: limite + 1,
        ...(opciones?.orden ? { orden: opciones.orden } : {}),
      });
      const pagina = resolverPagina(filas, limite);

      return { constancias: pagina.filas, hayMas: pagina.hayMas };
    });
  };
}
