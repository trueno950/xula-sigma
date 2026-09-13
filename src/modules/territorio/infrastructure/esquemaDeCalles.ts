import { isNull, sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  columnaTenant,
  enumerado,
  politicaTenant,
} from "@/shared/tenancy/esquema";
import type {
  CalleId,
  LugarId,
  NaturalezaDeEvento,
  TipoDeLugar,
} from "../domain";
import { NATURALEZAS_DE_EVENTO, TIPOS_DE_LUGAR } from "../domain";
/**
 * `esquema.ts` reexporta las tres: el glob de `drizzle.config.ts` solo
 * alcanza ese archivo. Ninguna se reexporta desde un barrel del modulo. El
 * porque esta en `superficiePublica.test.ts`.
 */
export const lugares = pgTable(
  "lugares",
  {
    id: uuid().primaryKey().defaultRandom().$type<LugarId>(),
    ayuntamientoId: columnaTenant(),
    tipo: text().notNull().$type<TipoDeLugar>(),
    nombre: text().notNull(),
    padreId: uuid().$type<LugarId>(),
    bajaEn: timestamp({ withTimezone: true }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lugares_tenant_idx").on(t.ayuntamientoId),
    // Destino del FK compuesto de `padreId` (auto-referencia) y de
    // `calles.lugarId` (decision 3 de design.md).
    unique("lugares_id_tenant_key").on(t.id, t.ayuntamientoId),
    foreignKey({
      columns: [t.padreId, t.ayuntamientoId],
      foreignColumns: [t.id, t.ayuntamientoId],
      name: "lugares_padre_tenant_fk",
    }),
    check("lugares_tipo_valido", enumerado("tipo", TIPOS_DE_LUGAR)),
    // El ciclo de largo 1, el unico expresable en una fila (design.md
    // seccion 7): un ciclo de largo >= 2 queda fuera de este CHECK, ver
    // el limite declarado ahi mismo.
    check("lugares_sin_autopadre", sql`${t.padreId} <> ${t.id}`),
    // A lo sumo una cabecera por municipio, mismo patron de indice unico
    // parcial que `ayuntamientos_una_plataforma`
    // (`shared/tenancy/esquema.ts:77`).
    uniqueIndex("lugares_una_cabecera")
      .on(t.ayuntamientoId)
      .where(sql`${t.tipo} = 'cabecera'`),
    index("lugares_padre_idx").on(t.ayuntamientoId, t.padreId),
    politicaTenant("lugares"),
  ],
).enableRLS();
export const calles = pgTable(
  "calles",
  {
    id: uuid().primaryKey().defaultRandom().$type<CalleId>(),
    ayuntamientoId: columnaTenant(),
    nombre: text().notNull(),
    // Asentamiento al que pertenece la calle. `NOT NULL` sin excepcion:
    // con `cabecera` como su propio `tipo` (design.md decision 3), toda
    // calle -incluida la de la cabecera- cuelga de un `lugares` real.
    lugarId: uuid().notNull().$type<LugarId>(),
    latitud: doublePrecision(),
    longitud: doublePrecision(),
    bajaEn: timestamp({ withTimezone: true }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("calles_tenant_idx").on(t.ayuntamientoId),
    unique("calles_id_tenant_key").on(t.id, t.ayuntamientoId),
    foreignKey({
      columns: [t.lugarId, t.ayuntamientoId],
      foreignColumns: [lugares.id, lugares.ayuntamientoId],
      name: "calles_lugar_tenant_fk",
    }),
    uniqueIndex("calles_tenant_lugar_nombre_idx")
      .on(t.ayuntamientoId, t.lugarId, t.nombre)
      .where(isNull(t.bajaEn)),
    check(
      "calles_punto_completo",
      sql`(${t.latitud} IS NULL) = (${t.longitud} IS NULL)`,
    ),
    politicaTenant("calles"),
  ],
).enableRLS();
/**
 * Append-only: el `GRANT` de `0015_eventos_de_calles.sql` da SELECT e
 * INSERT y nada mas, mismo mecanismo que `bitacora`
 * (`shared/tenancy/esquema.ts`). Sin JSON, nombres ni coordenadas: la
 * proyeccion rehidrata el estado con `callesParaMapa` o `callePorId`.
 */
export const eventosDeCalles = pgTable(
  "eventos_de_calles",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    calleId: uuid().notNull().$type<CalleId>(),
    naturaleza: text().notNull().$type<NaturalezaDeEvento>(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("eventos_de_calles_tenant_idx").on(t.ayuntamientoId),
    index("eventos_de_calles_calle_idx").on(t.ayuntamientoId, t.calleId),
    foreignKey({
      columns: [t.calleId, t.ayuntamientoId],
      foreignColumns: [calles.id, calles.ayuntamientoId],
      name: "eventos_de_calles_calle_tenant_fk",
    }),
    check(
      "eventos_de_calles_naturaleza_valida",
      enumerado("naturaleza", NATURALEZAS_DE_EVENTO),
    ),
    politicaTenant("eventos_de_calles"),
  ],
).enableRLS();
