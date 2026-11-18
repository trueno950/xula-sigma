import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDeReportes } from "../domain";
import { resolverPagina } from "../domain";
import type {
  FiltrosDeListado,
  RepositorioDeReportes,
  ResultadoDeListado,
} from "./puertos";
import type { CrearLecturaDeNombres } from "./puertosDeUbicacionesDeReporte";
import { conUbicaciones } from "./ubicacionesDeReportes";

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
 *
 * La ubicacion de cada fila (S4 de `reportes-ux`) se adjunta despues de
 * cerrar la transaccion: los nombres los resuelve `territorio` en su propio
 * `withTenant` (ver `conUbicaciones`).
 */
export function crearListarReportes(
  repositorio: Pick<RepositorioDeReportes, "listar">,
  crearLecturaDeNombres: CrearLecturaDeNombres,
) {
  return async function listarReportes(
    filtros: FiltrosDeListado,
    contexto: ContextoActual,
    opciones?: {
      limite?: number | undefined;
      orden?: OrdenDeReportes | undefined;
    },
  ): Promise<ResultadoDeListado> {
    const limite = opciones?.limite ?? TAMANO_DE_PAGINA;

    const pagina = await withTenant(contexto.ayuntamientoId, async (tx) => {
      const filas = await repositorio.listar(tx, filtros, {
        limite: limite + 1,
        ...(opciones?.orden ? { orden: opciones.orden } : {}),
      });

      return resolverPagina(filas, limite);
    });
    const reportes = await conUbicaciones(
      pagina.filas,
      crearLecturaDeNombres,
      contexto,
    );

    return { reportes, hayMas: pagina.hayMas };
  };
}
