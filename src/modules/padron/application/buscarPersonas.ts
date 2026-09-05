import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDePersonas } from "../domain";
import { normalizarParaBusqueda, resolverPagina } from "../domain";
import { TAMANO_DE_PAGINA } from "./listarPersonas";
import type {
  CatalogoDeAbreviaturas,
  RepositorioDePersonas,
  ResultadoDeListado,
} from "./puertos";

/**
 * Medido en design.md seccion 3: el mayor umbral que mantiene
 * `lo_ve_la_operadora_pct >= 95%` contra la clase "tecleando". Propia y no
 * heredada de una configuracion de servidor (spec, "no MUST heredar el
 * umbral").
 */
export const UMBRAL_BUSQUEDA = 0.3;

/**
 * Busqueda tolerante a variantes (design.md seccion 8). Sin guarda de rol,
 * mismo criterio que `listarPersonas`: leer el padron no es escribirlo.
 *
 * La expansion corre una sola vez aca, con el mismo catalogo y la misma
 * `normalizarParaBusqueda` que usa el adaptador al guardar — si la cadena
 * de busqueda y la columna guardada no pasaran por la misma funcion, la
 * comparacion de trigramas no significaria nada.
 *
 * Pagina igual que `listarPersonas`: pide `limite + 1` y recorta con
 * `resolverPagina`. `opciones.orden` reemplaza el orden por relevancia
 * (`similarity` descendente, el default del repositorio) por
 * apellido/nombre cuando el operador lo pide -las dos no se combinan.
 */
export function crearBuscarPersonas(
  repositorio: RepositorioDePersonas,
  catalogo: CatalogoDeAbreviaturas,
) {
  return function buscarPersonas(
    cadena: string,
    contexto: ContextoActual,
    opciones?: {
      limite?: number | undefined;
      orden?: OrdenDePersonas | undefined;
    },
  ): Promise<ResultadoDeListado> {
    const limite = opciones?.limite ?? TAMANO_DE_PAGINA;

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const expansiones = await catalogo.leer(tx);
      const cadenaExpandida = normalizarParaBusqueda(cadena, expansiones);

      const filas = await repositorio.buscar(tx, cadenaExpandida, {
        umbral: UMBRAL_BUSQUEDA,
        limite: limite + 1,
        ...(opciones?.orden ? { orden: opciones.orden } : {}),
      });
      const pagina = resolverPagina(filas, limite);

      return { personas: pagina.filas, hayMas: pagina.hayMas };
    });
  };
}
