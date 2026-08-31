import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
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
  MovimientoId,
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
 * Ninguna de las tres se reexporta desde ningun barrel del modulo. El
 * porque esta en `superficiePublica.test.ts`, mismo patron que `territorio`
 * y `constancias`.
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

/**
 * Sin columna `id` sustituta: la identidad de un contador **es** la tupla
 * `(ayuntamientoId, anio)` (design.md seccion 4) -- doble y no triple, a
 * diferencia de `foliosDeDocumentos`: la decision 2 cerro que no se
 * segmenta por tipo de incidencia.
 */
export const foliosDeReportes = pgTable(
  "folios_de_reportes",
  {
    ayuntamientoId: columnaTenant(),
    anio: integer().notNull(),
    ultimoConsecutivo: integer().notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.ayuntamientoId, t.anio],
      name: "folios_de_reportes_pk",
    }),
    check(
      "folios_de_reportes_consecutivo_positivo",
      sql`${t.ultimoConsecutivo} > 0`,
    ),
    politicaTenant("folios_de_reportes"),
  ],
).enableRLS();

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
