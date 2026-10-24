import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId, ZonaId } from "../domain";

export type ZonaAdministrable = {
  id: ZonaId;
  nombre: string;
  lugarId: LugarId;
};

export type RepositorioDeAdministracionDeZonas = {
  buscarActivaPorNombre(
    tx: TransaccionTenant,
    datos: { lugarId: LugarId; nombre: string },
  ): Promise<ZonaAdministrable | null>;
  crear(
    tx: TransaccionTenant,
    datos: {
      id: ZonaId;
      lugarId: LugarId;
      nombre: string;
      ayuntamientoId: AyuntamientoId;
    },
  ): Promise<void>;
  bloquearPorId(
    tx: TransaccionTenant,
    zonaId: ZonaId,
  ): Promise<ZonaAdministrable | null>;
  renombrar(
    tx: TransaccionTenant,
    datos: { id: ZonaId; nombre: string },
  ): Promise<void>;
  darDeBaja(tx: TransaccionTenant, zonaId: ZonaId): Promise<void>;
  calleActivaPorId(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<{ id: CalleId; lugarId: LugarId } | null>;
  perteneceLaCalle(
    tx: TransaccionTenant,
    datos: { zonaId: ZonaId; calleId: CalleId },
  ): Promise<boolean>;
  agregarCalle(
    tx: TransaccionTenant,
    datos: {
      zonaId: ZonaId;
      calleId: CalleId;
      lugarId: LugarId;
      ayuntamientoId: AyuntamientoId;
    },
  ): Promise<void>;
  quitarCalle(
    tx: TransaccionTenant,
    datos: { zonaId: ZonaId; calleId: CalleId },
  ): Promise<void>;
};
