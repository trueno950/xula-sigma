import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
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
  ConstanciaId,
  MotivoDeCancelacion,
  MotivoDeReimpresion,
  ReimpresionId,
  TipoDeDocumento,
} from "../domain";
import {
  MOTIVOS_DE_CANCELACION,
  MOTIVOS_DE_REIMPRESION,
  TIPOS_DE_DOCUMENTO,
} from "../domain";

/**
 * Ninguna de las cuatro se reexporta desde ningun barrel del modulo. El
 * porque esta en `superficiePublica.test.ts`, mismo patron que `territorio`.
 */
export const constancias = pgTable(
  "constancias",
  {
    id: uuid().primaryKey().defaultRandom().$type<ConstanciaId>(),
    ayuntamientoId: columnaTenant(),
    tipo: text().notNull().$type<TipoDeDocumento>(),
    // "VEC-2026-000001" -texto ya impreso, decision 3: el ancho del
    // relleno no es retroactivo, asi que no se re-deriva en la lectura.
    folio: text().notNull(),
    anio: integer().notNull(),
    consecutivo: integer().notNull(),
    // 64 bits de entropia, en claro a proposito (design.md seccion 8).
    codigoVerificacion: text().notNull(),
    // Sin `.references()` ni `$type<PersonaId>()`: `personas` es
    // inalcanzable fuera de `padron` (design.md decision 2). El FK
    // compuesto a mano en la cola de la migracion es la unica proteccion,
    // y es de Postgres, no de TypeScript.
    personaId: uuid().notNull(),
    datos: jsonb().notNull(),
    // Sin `$type<VersionDePlantilla>()`: ese tipo lo declara la Fase 5
    // (`infrastructure/plantillas/registro.ts`), que todavia no existe.
    plantillaVersion: text().notNull(),
    emitidaPorUsuarioId: uuid().notNull(),
    emitidaEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    canceladaEn: timestamp({ withTimezone: true }),
    canceladaPorUsuarioId: uuid(),
    motivoCancelacion: text().$type<MotivoDeCancelacion>(),
  },
  (t) => [
    index("constancias_tenant_idx").on(t.ayuntamientoId),
    // Destino del FK compuesto de `reimpresiones`.
    unique("constancias_id_tenant_key").on(t.id, t.ayuntamientoId),
    uniqueIndex("constancias_tenant_folio_idx").on(t.ayuntamientoId, t.folio),
    uniqueIndex("constancias_serie_idx").on(
      t.ayuntamientoId,
      t.tipo,
      t.anio,
      t.consecutivo,
    ),
    // Builder de Drizzle, nunca `sql\`…\``: un template que mencione
    // `persona_id` dispara `identidadPorPuerto.test.ts` (design.md seccion
    // 6, mismo motivo que `residencias_persona_idx` en `capa-territorial`).
    index("constancias_persona_idx").on(t.ayuntamientoId, t.personaId),
    foreignKey({
      columns: [t.emitidaPorUsuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "constancias_emitida_por_tenant_fk",
    }),
    foreignKey({
      columns: [t.canceladaPorUsuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "constancias_cancelada_por_tenant_fk",
    }),
    check("constancias_tipo_valido", enumerado("tipo", TIPOS_DE_DOCUMENTO)),
    check(
      "constancias_motivo_cancelacion_valido",
      sql`${t.motivoCancelacion} IS NULL OR ${enumerado("motivo_cancelacion", MOTIVOS_DE_CANCELACION)}`,
    ),
    // Las tres columnas de cancelacion viajan juntas o ninguna: una
    // cancelacion a medias (`cancelada_en` sin `motivo_cancelacion`, por
    // ejemplo) queda rechazada por esta igualdad.
    check(
      "constancias_cancelacion_completa",
      sql`(${t.canceladaEn} IS NULL) = (${t.motivoCancelacion} IS NULL) AND (${t.canceladaEn} IS NULL) = (${t.canceladaPorUsuarioId} IS NULL)`,
    ),
    check("constancias_consecutivo_positivo", sql`${t.consecutivo} > 0`),
    politicaTenant("constancias"),
  ],
).enableRLS();

export const reimpresiones = pgTable(
  "reimpresiones",
  {
    id: uuid().primaryKey().defaultRandom().$type<ReimpresionId>(),
    ayuntamientoId: columnaTenant(),
    constanciaId: uuid().notNull().$type<ConstanciaId>(),
    usuarioId: uuid().notNull(),
    motivo: text().notNull().$type<MotivoDeReimpresion>(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reimpresiones_tenant_idx").on(t.ayuntamientoId),
    index("reimpresiones_constancia_idx").on(t.ayuntamientoId, t.constanciaId),
    foreignKey({
      columns: [t.constanciaId, t.ayuntamientoId],
      foreignColumns: [constancias.id, constancias.ayuntamientoId],
      name: "reimpresiones_constancia_tenant_fk",
    }),
    foreignKey({
      columns: [t.usuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "reimpresiones_usuario_tenant_fk",
    }),
    check(
      "reimpresiones_motivo_valido",
      enumerado("motivo", MOTIVOS_DE_REIMPRESION),
    ),
    politicaTenant("reimpresiones"),
  ],
).enableRLS();

/**
 * Bloque de firma de `constancias`: firmante, cargo y leyenda de pie.
 * **No vive en `ayuntamientos`** -correccion sobre la version original de
 * design.md seccion 9, encontrada por GGA en la revision de esta rebanada-:
 * `ayuntamientos` tiene `pgPolicy("ayuntamientos_directorio_publico", {for:
 * "select", using: sql\`true\`})` porque `resolverAyuntamientoPorSubdominio`
 * la lee **antes** de que exista contexto de tenant -es lo que resuelve el
 * tenant, no algo que ya lo tenga-. `documentos` no tiene esa necesidad: se
 * lee siempre dentro de la transaccion de `emitirConstancia`, con el tenant
 * ya resuelto. Ponerlo en `ayuntamientos` heredaba una lectura publica sin
 * proposito, exactamente lo que el comentario de esa politica excluye a
 * proposito ("lo que nunca se expone es la operacion").
 *
 * Sin columna `id` sustituta, mismo criterio que `foliosDeDocumentos`: la
 * identidad es `ayuntamientoId`, una fila por municipio.
 */
export const configuracionDeDocumentos = pgTable(
  "configuracion_de_documentos",
  {
    ayuntamientoId: columnaTenant().primaryKey(),
    datos: jsonb().notNull().default({}),
  },
  () => [politicaTenant("configuracion_de_documentos")],
).enableRLS();

/**
 * Sin columna `id` sustituta: la identidad de un contador **es** la
 * tripleta `(ayuntamientoId, tipo, anio)` (design.md seccion 4). Un uuid
 * encima permitiria dos filas para la misma serie, que es exactamente el
 * estado que rompe la unicidad del folio.
 */
export const foliosDeDocumentos = pgTable(
  "folios_de_documentos",
  {
    ayuntamientoId: columnaTenant(),
    tipo: text().notNull().$type<TipoDeDocumento>(),
    anio: integer().notNull(),
    ultimoConsecutivo: integer().notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.ayuntamientoId, t.tipo, t.anio],
      name: "folios_de_documentos_pk",
    }),
    check("folios_tipo_valido", enumerado("tipo", TIPOS_DE_DOCUMENTO)),
    check("folios_consecutivo_positivo", sql`${t.ultimoConsecutivo} > 0`),
    politicaTenant("folios_de_documentos"),
  ],
).enableRLS();
