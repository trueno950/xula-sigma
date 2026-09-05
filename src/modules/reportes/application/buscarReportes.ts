import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDeReportes } from "../domain";
import { resolverPagina } from "../domain";
import { TAMANO_DE_PAGINA } from "./listarReportes";
import type {
  FiltrosDeListado,
  RepositorioDeReportes,
  ResultadoDeListado,
} from "./puertos";

/**
 * Buscador de texto libre del listado (`design.md`, "Buscador"): distinto
 * de `buscarReportesSimilares` -ese detecta duplicados al dar de alta
 * (rebanada 7), este busca sobre `folio`/`descripcion`/`referencia` para
 * encontrar un reporte ya existente. Sin guarda de rol, mismo criterio que
 * `listarReportes`: leer no es escribir.
 *
 * `opciones.filtros` convive con la busqueda -"nunca los reemplaza"
 * (`design.md`)-: el operador puede escribir texto y tener `estado`/`tipo`
 * puestos a la vez, y las dos condiciones se combinan en el repositorio.
 * Pagina igual que `listarReportes`: pide `limite + 1` y recorta con
 * `resolverPagina`.
 */
export function crearBuscarReportes(
  repositorio: Pick<RepositorioDeReportes, "buscar">,
) {
  return function buscarReportes(
    cadena: string,
    contexto: ContextoActual,
    opciones?: {
      filtros?: FiltrosDeListado | undefined;
      limite?: number | undefined;
      orden?: OrdenDeReportes | undefined;
    },
  ): Promise<ResultadoDeListado> {
    const limite = opciones?.limite ?? TAMANO_DE_PAGINA;

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const filas = await repositorio.buscar(tx, cadena, {
        limite: limite + 1,
        ...(opciones?.filtros ? { filtros: opciones.filtros } : {}),
        ...(opciones?.orden ? { orden: opciones.orden } : {}),
      });
      const pagina = resolverPagina(filas, limite);

      return { reportes: pagina.filas, hayMas: pagina.hayMas };
    });
  };
}
