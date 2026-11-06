import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";

/**
 * Lo que cuelga de un asentamiento por `lugarId` sin ser un lugar hijo:
 * `darDeBajaLugar` las cuenta, ademas de hijos y domicilios, antes de
 * marcar la baja. Solo filas activas (`baja_en IS NULL`). Vive aparte de
 * `puertos.ts` por la metrica de 200 lineas; `RepositorioDeLugares` las
 * incluye, asi que nadie cambia de repositorio.
 */
export type DependenciasDeLugar = {
  contarCallesActivas(tx: TransaccionTenant, lugarId: LugarId): Promise<number>;
  contarZonasActivas(tx: TransaccionTenant, lugarId: LugarId): Promise<number>;
};
