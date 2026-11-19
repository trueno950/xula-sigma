import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId, ZonaId } from "../domain";

export type ZonaGuardada = {
  id: ZonaId;
  nombre: string;
  lugarId: LugarId;
  asentamiento: string;
};

/**
 * La fila del listado: la zona y cuantas calles activas la componen. La
 * cuenta viaja en la misma consulta que las filas -una subconsulta
 * correlacionada, no una lectura por zona- porque el listado la muestra en
 * su propia columna (S13 de `odd/tasks/territorio-ux.md`).
 */
export type ZonaConCalles = ZonaGuardada & { calles: number };

export type RepositorioDeLecturaDeZonas = {
  listar(
    tx: TransaccionTenant,
    raizId: LugarId | null,
  ): Promise<readonly ZonaConCalles[]>;
  buscarPorId(
    tx: TransaccionTenant,
    zonaId: ZonaId,
  ): Promise<ZonaGuardada | null>;
  calles(
    tx: TransaccionTenant,
    zonaId: ZonaId,
  ): Promise<readonly { id: CalleId; nombre: string }[]>;
};
