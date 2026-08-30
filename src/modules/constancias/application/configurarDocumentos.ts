import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeDocumentos } from "./puertosDeLectura";
import { validarDocumentos } from "./validacionDeDocumentos";

/**
 * Escribe el bloque de firma de `constancias`. Lee el `jsonb` actual,
 * compone `{ …actual, …campos }`, valida el resultado completo y escribe
 * el **crudo compuesto**, nunca la salida de Zod: mismo mecanismo que
 * `marcaConEscudo` (`modules/marca/application/cambiarEscudo.ts`) y por el
 * mismo motivo -Zod descarta claves que no conoce, y escribir su salida
 * borraria en silencio un campo futuro- (design.md de
 * `constancias-oficios`, decision 8).
 */

const esObjetoPlano = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const documentosCompuestos = (
  actual: Record<string, unknown>,
  campos: Record<string, unknown>,
): Record<string, unknown> => {
  const propuesta = validarDocumentos({ ...actual, ...campos });

  if (!propuesta.ok) throw new ValidacionError(propuesta.campos);

  return { ...actual, ...campos };
};

export function crearConfigurarDocumentos(
  repositorio: RepositorioDeDocumentos,
) {
  return async function configurarDocumentos(
    campos: Record<string, unknown>,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarDocumentos(contexto.usuario.rol))
      throw new NoAutorizadoError();

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const filaActual = await repositorio.leer(tx, contexto.ayuntamientoId);
      const actual = esObjetoPlano(filaActual) ? filaActual : {};

      await repositorio.escribir(
        tx,
        contexto.ayuntamientoId,
        documentosCompuestos(actual, campos),
      );
    });
  };
}
