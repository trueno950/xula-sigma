import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  DomicilioParaListado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";

/**
 * Sin guarda de rol a proposito, mismo criterio que `listarCalles` y
 * `listarPersonas`: leer el catalogo de domicilios no es escribirlo.
 * Alimenta el `<select>` de `FormularioDeMudanza` para cualquier rol que
 * pueda ver la pagina de la persona.
 */
export function crearListarDomicilios(repositorio: RepositorioDeDomicilios) {
  return function listarDomicilios(
    contexto: ContextoActual,
  ): Promise<readonly DomicilioParaListado[]> {
    return withTenant(contexto.ayuntamientoId, (tx) => repositorio.listar(tx));
  };
}
