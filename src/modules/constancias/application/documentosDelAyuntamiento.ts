import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeDocumentos } from "./puertosDeLectura";
import type { Documentos } from "./validacionDeDocumentos";
import { leerDocumentos } from "./validacionDeDocumentos";

/**
 * Lee el bloque de firma de `constancias`. Sin guarda de rol propia
 * (tasks.md 3.10): solo la escritura exige `puedeAdministrarDocumentos`
 * -cualquier pantalla que muestre el estado de configuracion necesita
 * leerlo, sin distincion de rol-.
 */
export function crearDocumentosDelAyuntamiento(
  repositorio: RepositorioDeDocumentos,
) {
  return async function documentosDelAyuntamiento(
    contexto: ContextoActual,
  ): Promise<Documentos | null> {
    const valor = await withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.leer(tx, contexto.ayuntamientoId),
    );

    return leerDocumentos(valor);
  };
}
