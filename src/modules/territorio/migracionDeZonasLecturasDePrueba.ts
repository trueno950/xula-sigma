import { and, eq, or } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId, ZonaId } from "./domain";
import { callesDeZonas, lugares, zonas } from "./infrastructure/esquema";

const membresiasDe = (
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  ayuntamientoId: AyuntamientoId,
  zonaId: ZonaId | undefined,
) =>
  zonaId
    ? tx
        .select({
          zonaId: callesDeZonas.zonaId,
          calleId: callesDeZonas.calleId,
        })
        .from(callesDeZonas)
        .where(
          and(
            eq(callesDeZonas.ayuntamientoId, ayuntamientoId),
            eq(callesDeZonas.zonaId, zonaId),
          ),
        )
    : [];

export const leerZonasYBajas = (opciones: {
  ayuntamientoId: AyuntamientoId;
  asentamientoId: LugarId;
  sectorId: LugarId;
  manzanaId: LugarId;
  nombreDelSector: string;
  nombreDeLaZonaVacia: string;
}) =>
  withTenant(opciones.ayuntamientoId, async (tx) => {
    const zonasMigradas = await tx
      .select({
        id: zonas.id,
        lugarId: zonas.lugarId,
        nombre: zonas.nombre,
        bajaEn: zonas.bajaEn,
        ayuntamientoId: zonas.ayuntamientoId,
      })
      .from(zonas)
      .where(
        and(
          eq(zonas.ayuntamientoId, opciones.ayuntamientoId),
          eq(zonas.lugarId, opciones.asentamientoId),
        ),
      );
    const zonaDelSector = zonasMigradas.find(
      ({ nombre }) => nombre === opciones.nombreDelSector,
    );
    const zonaVacia = zonasMigradas.find(
      ({ nombre }) => nombre === opciones.nombreDeLaZonaVacia,
    );
    return {
      zonasMigradas,
      membresias: await membresiasDe(
        tx,
        opciones.ayuntamientoId,
        zonaDelSector?.id,
      ),
      membresiasDeZonaVacia: await membresiasDe(
        tx,
        opciones.ayuntamientoId,
        zonaVacia?.id,
      ),
      lugaresRestantes: await tx
        .select({ id: lugares.id })
        .from(lugares)
        .where(
          or(
            eq(lugares.id, opciones.sectorId),
            eq(lugares.id, opciones.manzanaId),
          ),
        ),
      bajas: await tx
        .select({
          accion: bitacora.accion,
          entidad: bitacora.entidad,
          entidadId: bitacora.entidadId,
          origen: bitacora.origen,
        })
        .from(bitacora)
        .where(
          and(
            eq(bitacora.accion, "BAJA_LUGAR"),
            eq(bitacora.entidad, "lugares"),
          ),
        ),
    };
  });
