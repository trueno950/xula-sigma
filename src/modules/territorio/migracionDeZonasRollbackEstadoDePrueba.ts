import { asc, eq, or, sql } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { withTenantAnterior } from "./conexionAnteriorAlCorteDePrueba";
import { lugares, zonas } from "./infrastructure/esquema";

export const leerEstadoDeIdempotencia = ({
  ayuntamientoId,
}: {
  ayuntamientoId: AyuntamientoId;
}) =>
  withTenantAnterior(ayuntamientoId, async (tx) => {
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
    // Los dos tipos que el corte elimino: la comparacion va como texto
    // porque `lugares.tipo` se tipa con el catalogo vigente y estos valores
    // ya no estan en el.
    const lugaresSectorManzana = await tx
      .select({ id: lugares.id, tipo: sql<string>`${lugares.tipo}` })
      .from(lugares)
      .where(sql`${lugares.tipo} IN ('sector', 'manzana')`)
      .orderBy(asc(sql`${lugares.tipo}`), asc(lugares.id));
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
