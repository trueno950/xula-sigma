import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId, ZonaId } from "../domain";

export type ZonaGuardada = {
  id: ZonaId;
  nombre: string;
  lugarId: LugarId;
  asentamiento: string;
};

export type RepositorioDeLecturaDeZonas = {
  listar(
    tx: TransaccionTenant,
    raizId: LugarId | null,
  ): Promise<readonly ZonaGuardada[]>;
  buscarPorId(
    tx: TransaccionTenant,
    zonaId: ZonaId,
  ): Promise<ZonaGuardada | null>;
  calles(
    tx: TransaccionTenant,
    zonaId: ZonaId,
  ): Promise<readonly { id: CalleId; nombre: string }[]>;
};
