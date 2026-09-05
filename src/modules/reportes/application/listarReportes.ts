import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDeReportes } from "../domain";
import { resolverPagina } from "../domain";
import type {
  FiltrosDeListado,
  RepositorioDeReportes,
  ResultadoDeListado,
} from "./puertos";

/**
 * Tamano de pagina fijo de `design.md`, seccion "Paginacion": bajarlo no
 * ahorra en la red rural -sigue siendo una sola respuesta HTML-, y subirlo
 * pierde el punto de paginar. Propia y no heredada de configuracion, mismo
 * criterio que `TAMANO_DE_PAGINA` en `padron`.
 */
export const TAMANO_DE_PAGINA = 50;

/**
 * Lista los reportes del ayuntamiento del contexto. Sin guarda de rol
 * propia, mismo criterio que `reportePorId` y `constanciaPorId`: leer no es
 * escribir y RLS ya acota. Los filtros pasan tal cual al repositorio.
 *
 * Pide `limite + 1` al repositorio y lo recorta con `resolverPagina`
 * (`domain/paginacion.ts`): asi la pantalla sabe si pintar "Ver mas" sin un
 * `COUNT(*)` aparte -mismo mecanismo que `listarPersonas`.
 */
export function crearListarReportes(
  repositorio: Pick<RepositorioDeReportes, "listar">,
) {
  return function listarReportes(
    filtros: FiltrosDeListado,
    contexto: ContextoActual,
    opciones?: {
      limite?: number | undefined;
      orden?: OrdenDeReportes | undefined;
    },
  ): Promise<ResultadoDeListado> {
    const limite = opciones?.limite ?? TAMANO_DE_PAGINA;

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const filas = await repositorio.listar(tx, filtros, {
        limite: limite + 1,
        ...(opciones?.orden ? { orden: opciones.orden } : {}),
      });
      const pagina = resolverPagina(filas, limite);

      return { reportes: pagina.filas, hayMas: pagina.hayMas };
    });
  };
}
