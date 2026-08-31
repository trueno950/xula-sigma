import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
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
  ReporteId,
  TipoDeIncidencia,
} from "../domain";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  MOTIVOS_DE_RECHAZO,
  TIPOS_DE_INCIDENCIA,
} from "../domain";

/**
 * No se reexporta desde ningun barrel del modulo. El porque esta en
 * `superficiePublica.test.ts`, mismo patron que `territorio` y
 * `constancias`.
 */
export const reportes = pgTable(
  "reportes",
  {
    id: uuid().primaryKey().defaultRandom().$type<ReporteId>(),
    ayuntamientoId: columnaTenant(),
    // "REP-2026-000123", texto ya impreso -- el ancho del relleno no es
    // retroactivo, misma razon que `constancias.folio` (design.md seccion 4).
    folio: text().notNull(),
    anio: integer().notNull(),
    consecutivo: integer().notNull(),
    tipo: text().notNull().$type<TipoDeIncidencia>(),
    estado: text().notNull().$type<EstadoDeReporte>(),
    areaResponsable: text().$type<AreaResponsable>(),
    // Sin `.references()` ni `$type<LugarId>()`: `lugares` es inalcanzable
    // fuera de `territorio` (design.md seccion 6, decision 10). El FK
    // compuesto a mano en la cola de la migracion es la unica proteccion,
    // y es de Postgres, no de TypeScript.
    lugarId: uuid().notNull(),
    // idem: `calles` es inalcanzable fuera de `territorio`.
    calleId: uuid(),
    referencia: text(),
    descripcion: text().notNull(),
    // idem: `personas` es inalcanzable fuera de `padron` (decision 11).
    personaId: uuid(),
    motivoDeRechazo: text().$type<MotivoDeRechazo>(),
    // FK compuesto AUTORREFERENCIAL. `reportes` se alcanza a si misma, asi
    // que Drizzle si lo emite -- precedente `lugares_padre_tenant_fk`
    // (design.md seccion 6, correccion sobre la propuesta: no va a mano).
    duplicadoDeReporteId: uuid().$type<ReporteId>(),
    registradoPorUsuarioId: uuid().notNull(),
    registradoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reportes_tenant_idx").on(t.ayuntamientoId),
    // Destino del FK compuesto autorreferencial y del de
    // `movimientos_de_reportes`.
    unique("reportes_id_tenant_key").on(t.id, t.ayuntamientoId),
    uniqueIndex("reportes_tenant_folio_idx").on(t.ayuntamientoId, t.folio),
    uniqueIndex("reportes_serie_idx").on(
      t.ayuntamientoId,
      t.anio,
      t.consecutivo,
    ),
    index("reportes_duplicado_idx").on(
      t.ayuntamientoId,
      t.duplicadoDeReporteId,
    ),
    index("reportes_similares_idx").on(
      t.ayuntamientoId,
      t.lugarId,
      t.tipo,
      t.estado,
    ),
    foreignKey({
      columns: [t.registradoPorUsuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "reportes_registrado_por_tenant_fk",
    }),
    foreignKey({
      columns: [t.duplicadoDeReporteId, t.ayuntamientoId],
      foreignColumns: [t.id, t.ayuntamientoId],
      name: "reportes_duplicado_tenant_fk",
    }),
    check("reportes_tipo_valido", enumerado("tipo", TIPOS_DE_INCIDENCIA)),
    check("reportes_estado_valido", enumerado("estado", ESTADOS_DE_REPORTE)),
    check(
      "reportes_area_valida",
      sql`${t.areaResponsable} IS NULL OR ${enumerado("area_responsable", AREAS_RESPONSABLES)}`,
    ),
    check(
      "reportes_motivo_valido",
      sql`${t.motivoDeRechazo} IS NULL OR ${enumerado("motivo_de_rechazo", MOTIVOS_DE_RECHAZO)}`,
    ),
    check(
      "reportes_rechazo_completo",
      sql`(${t.estado} = 'RECHAZADO') = (${t.motivoDeRechazo} IS NOT NULL)`,
    ),
    // `IS NOT DISTINCT FROM`, nunca `=` (design.md seccion 5): con `=`,
    // `motivo_de_rechazo = 'DUPLICADO'` sobre un motivo nulo evalua NULL y
    // el CHECK pasa en verde, dejando entrar la fila que existe para
    // rechazar -- sin motivo y con vinculo de duplicado.
    check(
      "reportes_duplicado_con_motivo",
      sql`(${t.motivoDeRechazo} IS NOT DISTINCT FROM 'DUPLICADO') = (${t.duplicadoDeReporteId} IS NOT NULL)`,
    ),
    // El ciclo de largo 1, el unico expresable en una fila (design.md
    // seccion 8): un ciclo de largo >= 2 queda fuera de este CHECK, y la
    // aplicacion nunca lo puede escribir por el orden de esa misma seccion.
    check(
      "reportes_sin_autoduplicado",
      sql`${t.duplicadoDeReporteId} <> ${t.id}`,
    ),
    check("reportes_consecutivo_positivo", sql`${t.consecutivo} > 0`),
    politicaTenant("reportes"),
  ],
).enableRLS();
