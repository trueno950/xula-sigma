import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usuarios } from "@/shared/auth/esquema";
import {
  columnaTenant,
  enumerado,
  politicaTenant,
} from "@/shared/tenancy/esquema";
import type {
  AreaResponsable,
  EstadoDeReporte,
  MotivoDeRechazo,
  MovimientoId,
  ReporteId,
} from "../domain";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  MOTIVOS_DE_RECHAZO,
} from "../domain";
import { reportes } from "./reportes";

export const movimientosDeReportes = pgTable(
  "movimientos_de_reportes",
  {
    id: uuid().primaryKey().defaultRandom().$type<MovimientoId>(),
    ayuntamientoId: columnaTenant(),
    reporteId: uuid().notNull().$type<ReporteId>(),
    usuarioId: uuid().notNull(),
    estadoAnterior: text().$type<EstadoDeReporte>(),
    estadoNuevo: text().$type<EstadoDeReporte>(),
    areaAsignada: text().$type<AreaResponsable>(),
    motivo: text().$type<MotivoDeRechazo>(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("movimientos_de_reportes_tenant_idx").on(t.ayuntamientoId),
    index("movimientos_de_reportes_reporte_idx").on(
      t.ayuntamientoId,
      t.reporteId,
    ),
    foreignKey({
      columns: [t.reporteId, t.ayuntamientoId],
      foreignColumns: [reportes.id, reportes.ayuntamientoId],
      name: "movimientos_de_reportes_reporte_tenant_fk",
    }),
    foreignKey({
      columns: [t.usuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "movimientos_de_reportes_usuario_tenant_fk",
    }),
    check(
      "movimientos_estado_anterior_valido",
      sql`${t.estadoAnterior} IS NULL OR ${enumerado("estado_anterior", ESTADOS_DE_REPORTE)}`,
    ),
    check(
      "movimientos_estado_nuevo_valido",
      sql`${t.estadoNuevo} IS NULL OR ${enumerado("estado_nuevo", ESTADOS_DE_REPORTE)}`,
    ),
    check(
      "movimientos_area_valida",
      sql`${t.areaAsignada} IS NULL OR ${enumerado("area_asignada", AREAS_RESPONSABLES)}`,
    ),
    check(
      "movimientos_motivo_valido",
      sql`${t.motivo} IS NULL OR ${enumerado("motivo", MOTIVOS_DE_RECHAZO)}`,
    ),
    // Una fila que no cambia nada no describe ningun movimiento.
    check(
      "movimientos_no_vacio",
      sql`${t.estadoNuevo} IS NOT NULL OR ${t.areaAsignada} IS NOT NULL`,
    ),
    check(
      "movimientos_motivo_solo_en_rechazo",
      sql`${t.motivo} IS NULL OR ${t.estadoNuevo} IS NOT DISTINCT FROM 'RECHAZADO'`,
    ),
    politicaTenant("movimientos_de_reportes"),
  ],
).enableRLS();
