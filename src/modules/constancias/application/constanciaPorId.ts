import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ConstanciaId } from "../domain";
import type { ConstanciaGuardada, RepositorioDeConstancias } from "./puertos";

/**
 * Lectura por id, sin guarda de rol propia -mismo criterio que
 * `documentosDelAyuntamiento`: leer no es escribir-. `null` cuando el id no
 * existe o es de otro tenant -RLS los deja ver iguales del lado de quien
 * pregunta-, nunca lanza: quien decide que eso es un 404 es el borde
 * (design.md de `constancias-oficios`, seccion 13: "un municipio no ve las
 * constancias de otro por id directo").
 */
export function crearConstanciaPorId(repositorio: RepositorioDeConstancias) {
  return function constanciaPorId(
    id: ConstanciaId,
    contexto: ContextoActual,
  ): Promise<ConstanciaGuardada | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
  };
}
