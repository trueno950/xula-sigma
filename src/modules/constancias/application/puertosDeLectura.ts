import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que los casos de uso de `constancias` necesitan para leer y escribir
 * `configuracion_de_documentos` sin componer SQL a mano (antipatron 7 de
 * `AGENTS.md`). Las dos operaciones reciben la transaccion de `withTenant`
 * por parametro y no la abren ellas mismas: mismo criterio que
 * `RepositorioDeMarca` (`modules/marca/application/puertos.ts`).
 *
 * Repositorio propio, no el de `marca`: compartirlo obligaria a
 * `constancias` a importar `marca`, una arista entre modulos donde alcanza
 * un `tx.update(configuracionDeDocumentos)` (design.md de
 * `constancias-oficios`, decision 8).
 */
export type RepositorioDeDocumentos = {
  /**
   * El valor crudo de `datos` para ese ayuntamiento, o `null` si la fila
   * no existe -un ayuntamiento sin fila es "sin configurar"-. No valida ni
   * normaliza: `datos` sigue siendo `unknown` de este lado, y quien
   * pregunta decide que hacer con un valor que no es un objeto plano.
   */
  leer(tx: TransaccionTenant, ayuntamientoId: AyuntamientoId): Promise<unknown>;
  /**
   * Reemplaza `datos` entero para ese ayuntamiento, dentro de `tx`, con
   * `INSERT ... ON CONFLICT (ayuntamiento_id) DO UPDATE` -la tabla no tiene
   * `GRANT` de `DELETE`, la configuracion se actualiza, nunca se borra.
   */
  escribir(
    tx: TransaccionTenant,
    ayuntamientoId: AyuntamientoId,
    datos: Record<string, unknown>,
  ): Promise<void>;
};
