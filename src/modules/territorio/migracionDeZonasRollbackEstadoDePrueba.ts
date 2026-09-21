import { asc, eq, or } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import { lugares, zonas } from "./infrastructure/esquema";

export const leerEstadoDeIdempotencia = ({
  ayuntamientoId,
}: {
  ayuntamientoId: AyuntamientoId;
}) =>
  withTenant(ayuntamientoId, async (tx) => {
    const bitacoraMigracion = await tx
      .select({ id: bitacora.id, accion: bitacora.accion })
      .from(bitacora)
      .where(
        or(
          eq(bitacora.accion, "MIGRACION_DOMICILIO"),
          eq(bitacora.accion, "BAJA_LUGAR"),
        ),
      )
      .orderBy(asc(bitacora.id));
    const zonasActuales = await tx
      .select({ id: zonas.id })
      .from(zonas)
      .orderBy(asc(zonas.id));
    const lugaresSectorManzana = await tx
      .select({ id: lugares.id, tipo: lugares.tipo })
      .from(lugares)
      .where(or(eq(lugares.tipo, "sector"), eq(lugares.tipo, "manzana")))
      .orderBy(asc(lugares.tipo), asc(lugares.id));
    return {
      migraciones: bitacoraMigracion
        .filter(({ accion }) => accion === "MIGRACION_DOMICILIO")
        .map(({ id }) => id),
      bajas: bitacoraMigracion
        .filter(({ accion }) => accion === "BAJA_LUGAR")
        .map(({ id }) => id),
      zonas: zonasActuales.map(({ id }) => id),
      lugaresSectorManzana,
    };
  });
