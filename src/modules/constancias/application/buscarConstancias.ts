import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDeConstancias } from "../domain";
import { resolverPagina } from "../domain";
import { TAMANO_DE_PAGINA } from "./listarConstancias";
import type {
  FiltrosDeListado,
  RepositorioDeConstancias,
  ResultadoDeListado,
} from "./puertos";

/**
 * Buscador de texto libre del listado (`design.md`, "Buscador"): sobre
 * `folio` y sobre el nombre del titular congelado en el snapshot. Sin
 * guarda de rol, mismo criterio que `listarConstancias`: leer no es
 * escribir.
 *
 * `opciones.filtros` convive con la busqueda -"nunca los reemplaza"
 * (`design.md`)-: el operador puede escribir texto y tener `estado` puesto
 * a la vez, y las dos condiciones se combinan en el repositorio. Pagina
 * igual que `listarConstancias`: pide `limite + 1` y recorta con
 * `resolverPagina`.
 */
export function crearBuscarConstancias(
  repositorio: Pick<RepositorioDeConstancias, "buscar">,
) {
  return function buscarConstancias(
    cadena: string,
    contexto: ContextoActual,
    opciones?: {
      filtros?: FiltrosDeListado | undefined;
      limite?: number | undefined;
      orden?: OrdenDeConstancias | undefined;
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

      return { constancias: pagina.filas, hayMas: pagina.hayMas };
    });
  };
}
