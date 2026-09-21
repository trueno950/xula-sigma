import { sql } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import { lugares } from "./infrastructure/esquema";
import type { LugarBorradoDeSalida } from "./migracionDeZonasRollbackDePrueba";

const ordenarPadresPrimero = (filas: LugarBorradoDeSalida[]) => {
  const pendientes = [...filas];
  const ordenadas: LugarBorradoDeSalida[] = [];
  while (pendientes.length) {
    const indice = pendientes.findIndex(
      ({ padreId }) =>
        !padreId || !pendientes.some(({ lugarId }) => lugarId === padreId),
    );
    if (indice < 0) throw new Error("La salida guardada tiene un ciclo.");
    const fila = pendientes.splice(indice, 1)[0];
    if (!fila) throw new Error("No se pudo ordenar la salida guardada.");
    ordenadas.push(fila);
  }
  return ordenadas;
};
export const revertirMigracion = async (opciones: {
  ayuntamientoId: AyuntamientoId;
  lugaresBorrados: LugarBorradoDeSalida[];
}) =>
  withTenant(opciones.ayuntamientoId, async (tx) => {
    for (const lugar of ordenarPadresPrimero(opciones.lugaresBorrados)) {
      await tx.insert(lugares).values({
        id: lugar.lugarId,
        ayuntamientoId: opciones.ayuntamientoId,
        tipo: lugar.tipo,
        nombre: lugar.nombre,
        padreId: lugar.padreId,
        bajaEn: lugar.bajaEn === null ? null : new Date(lugar.bajaEn),
      });
    }
    await tx.execute(
      sql`UPDATE domicilios AS d
          SET lugar_id = split_part(b.origen, ':', 3)::uuid
          FROM bitacora AS b
          WHERE b.ayuntamiento_id = ${opciones.ayuntamientoId}
            AND b.accion = 'MIGRACION_DOMICILIO'
            AND b.entidad = 'domicilios'
            AND b.entidad_id = d.id
            AND d.ayuntamiento_id = ${opciones.ayuntamientoId}`,
    );
  });
