import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId } from "../domain";

/**
 * Lo que usa una calle y frena moverla o darla de baja. Vive aparte de
 * `puertos.ts` por la metrica de 200 lineas; `RepositorioDeCalles` las
 * incluye, asi que nadie cambia de repositorio.
 */
export type ConteosDeUsoDeCalle = {
  contarDomiciliosQueLaUsan(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<number>;
  /** Incluye zonas de baja: sus filas siguen y su llave frena el reparenteo. */
  contarZonasQueLaUsan(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<number>;
  /** Solo las zonas activas (`zonas.baja_en IS NULL`): lo que frena la baja. */
  contarZonasActivasQueLaUsan(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<number>;
};
