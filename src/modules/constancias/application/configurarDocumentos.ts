import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeDocumentos } from "./puertosDeLectura";
import { validarDocumentos } from "./validacionDeDocumentos";

/**
 * Escribe el bloque de firma de `constancias`. Mismo mecanismo y motivo
 * que `marcaConEscudo` (`modules/marca/application/cambiarEscudo.ts`):
 * design.md de `constancias-oficios`, decision 8.
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
