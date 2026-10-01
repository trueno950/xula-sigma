import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { OrdenDePersonas } from "../domain";
import { resolverPagina } from "../domain";
import type { RepositorioDePersonas, ResultadoDeListado } from "./puertos";

/**
 * Tamano de pagina fijo de `design.md`, seccion "Paginacion": bajarlo no
 * ahorra en la red rural -sigue siendo una sola respuesta HTML-, y subirlo
 * pierde el punto de paginar. Propia y no heredada de configuracion, mismo
 * criterio que `UMBRAL_BUSQUEDA` en `buscarPersonas.ts`.
 */
export const TAMANO_DE_PAGINA = 50;

/**
 * Sin guarda de rol a proposito: leer el padron no es escribirlo
 * (`puedeEscribir` acota alta, edicion y baja, no la lectura), y
 * `PRODUCT.md` describe un rol de solo lectura (`Secretario / Consulta`)
 * al que negarle esto seria incorrecto. `bajaEn` no nulo ya queda afuera
 * del lado del repositorio.
 *
 * Unico lugar que explica esta decision: `listarPersonas.test.ts` y
 * `app/(panel)/padron/(lista)/page.tsx` apuntan aca en vez de repetirla.
 *
 * Pide `limite + 1` al repositorio y lo recorta con `resolverPagina`
 * (`domain/paginacion.ts`): asi la pantalla sabe si pintar "Ver mas" sin un
 * `COUNT(*)` aparte.
 */
export function crearListarPersonas(repositorio: RepositorioDePersonas) {
  return function listarPersonas(
    contexto: ContextoActual,
    opciones?: {
      limite?: number | undefined;
      orden?: OrdenDePersonas | undefined;
    },
  ): Promise<ResultadoDeListado> {
    const limite = opciones?.limite ?? TAMANO_DE_PAGINA;

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const filas = await repositorio.listar(tx, {
        limite: limite + 1,
        ...(opciones?.orden ? { orden: opciones.orden } : {}),
      });
      const pagina = resolverPagina(filas, limite);

      return { personas: pagina.filas, hayMas: pagina.hayMas };
    });
  };
}
