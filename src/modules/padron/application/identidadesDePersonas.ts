import type { ContextoActual } from "@/shared/auth/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";

/**
 * Lectura en lote de `RepositorioDePersonas.identidadesDe`: pedirla persona
 * por persona reintroduce el N+1 que la lectura que la consume evita. Vive
 * aca y no en `puertos.ts` porque es la unica que la necesita, mismo
 * criterio que `puertosDe*` de otros modulos.
 */
export type LectorDeIdentidadesEnLote = {
  /**
   * `terminal -> todos los ids que colapsan en ella`, terminal primero. Un
   * id que RLS no devuelve -otro municipio- no arma grupo.
   */
  deVarias(
    tx: TransaccionTenant,
    ids: readonly PersonaId[],
  ): Promise<ReadonlyMap<PersonaId, readonly PersonaId[]>>;
};

/**
 * Version por lote de `identidadesDePersona`, para quien necesita el mapa
 * completo de una pagina antes de pedir los datos de esas identidades en
 * otra lectura. Sin ids no abre transaccion, igual que
 * `direccionesVigentesDePersonas` de `territorio`.
 */
export function crearIdentidadesDePersonas(lector: LectorDeIdentidadesEnLote) {
  return function identidadesDePersonas(
    ids: readonly PersonaId[],
    contexto: ContextoActual,
  ): Promise<ReadonlyMap<PersonaId, readonly PersonaId[]>> {
    if (ids.length === 0) return Promise.resolve(new Map());

    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.deVarias(tx, ids),
    );
  };
}
