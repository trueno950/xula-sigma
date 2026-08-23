import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import { normalizarParaBusqueda } from "../domain";
import type {
  CatalogoDeAbreviaturas,
  PersonaGuardada,
  RepositorioDePersonas,
} from "./puertos";

/**
 * Medido en design.md seccion 3, clase "tecleando" (nombre de pila + las
 * primeras cuatro letras del apellido paterno): el mayor umbral que
 * mantiene `lo_devuelve_pct >= 95%`. Coincide hoy con `UMBRAL_BUSQUEDA` de
 * `buscarPersonas.ts`, pero son dos decisiones distintas medidas por
 * separado — una puede moverse sin la otra, por eso no comparten
 * constante.
 */
export const UMBRAL_SUGERENCIA = 0.3;

/** El menor N con `lo_ve_la_operadora_pct >= 95%` a `UMBRAL_SUGERENCIA`. */
export const TOPE_SUGERENCIAS = 5;

/**
 * Sugerencia de duplicados durante la captura (spec, "nunca bloqueante").
 * Nunca lanza por falta de coincidencias: una lista vacia es una respuesta
 * valida, no un error. Sin guarda de rol, mismo criterio que
 * `buscarPersonas`: es lectura, y la escritura del alta se guarda sola.
 */
export function crearSugerirDuplicados(
  repositorio: RepositorioDePersonas,
  catalogo: CatalogoDeAbreviaturas,
) {
  return function sugerirDuplicados(
    cadena: string,
    contexto: ContextoActual,
  ): Promise<readonly PersonaGuardada[]> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const expansiones = await catalogo.leer(tx);
      const cadenaExpandida = normalizarParaBusqueda(cadena, expansiones);
      const encontradas = await repositorio.buscar(
        tx,
        cadenaExpandida,
        UMBRAL_SUGERENCIA,
      );

      return encontradas.slice(0, TOPE_SUGERENCIAS);
    });
  };
}
