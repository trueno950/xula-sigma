import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import { normalizarParaBusqueda } from "../domain";
import type {
  CatalogoDeAbreviaturas,
  PersonaGuardada,
  RepositorioDePersonas,
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
 */
export function crearBuscarPersonas(
  repositorio: RepositorioDePersonas,
  catalogo: CatalogoDeAbreviaturas,
) {
  return function buscarPersonas(
    cadena: string,
    contexto: ContextoActual,
  ): Promise<readonly PersonaGuardada[]> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const expansiones = await catalogo.leer(tx);
      const cadenaExpandida = normalizarParaBusqueda(cadena, expansiones);

      return repositorio.buscar(tx, cadenaExpandida, UMBRAL_BUSQUEDA);
    });
  };
}
