import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { usuarios } from "@/shared/auth/esquema";
import {
  columnaTenant,
  enumerado,
  politicaTenant,
} from "@/shared/tenancy/esquema";
import type { ValoresAnterioresDeIntervencion } from "../application/puertos";
import type {
  EstadoDeIntervencion,
  IntervencionId,
  TipoDeIntervencion,
} from "../domain";
import { ESTADOS_DE_INTERVENCION, TIPOS_DE_INTERVENCION } from "../domain";

export const intervenciones = pgTable(
  "intervenciones",
  {
    id: uuid().primaryKey().defaultRandom().$type<IntervencionId>(),
    ayuntamientoId: columnaTenant(),
    tipo: text().notNull().$type<TipoDeIntervencion>(),
    estado: text().notNull().$type<EstadoDeIntervencion>(),
    fechaDeOcurrencia: date().notNull(),
    // Los ids de otros modulos permanecen sin tipos de dominio ajenos.
    lugarId: uuid().notNull(),
    calleId: uuid(),
    reporteId: uuid(),
    descripcion: text().notNull(),
    registradoPorUsuarioId: uuid().notNull(),
    capturadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("intervenciones_tenant_idx").on(t.ayuntamientoId),
    index("intervenciones_lugar_idx").on(t.ayuntamientoId, t.lugarId),
    index("intervenciones_calle_idx").on(t.ayuntamientoId, t.calleId),
    index("intervenciones_reporte_idx").on(t.ayuntamientoId, t.reporteId),
    unique("intervenciones_id_tenant_key").on(t.id, t.ayuntamientoId),
    foreignKey({
      columns: [t.registradoPorUsuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "intervenciones_registrado_por_tenant_fk",
    }),
    check(
      "intervenciones_tipo_valido",
      enumerado("tipo", TIPOS_DE_INTERVENCION),
    ),
    check(
      "intervenciones_estado_valido",
      enumerado("estado", ESTADOS_DE_INTERVENCION),
    ),
    check(
      "intervenciones_descripcion_acotada",
      sql`char_length(${t.descripcion}) BETWEEN 10 AND 1000`,
    ),
    politicaTenant("intervenciones"),
  ],
).enableRLS();

export const revisionesDeIntervenciones = pgTable(
  "revisiones_de_intervenciones",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    intervencionId: uuid().notNull().$type<IntervencionId>(),
    valoresAnteriores: jsonb()
      .notNull()
      .$type<ValoresAnterioresDeIntervencion>(),
    usuarioId: uuid().notNull(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("revisiones_intervenciones_tenant_idx").on(t.ayuntamientoId),
    index("revisiones_intervenciones_intervencion_idx").on(
      t.ayuntamientoId,
      t.intervencionId,
    ),
    foreignKey({
      columns: [t.intervencionId, t.ayuntamientoId],
      foreignColumns: [intervenciones.id, intervenciones.ayuntamientoId],
      name: "revisiones_intervenciones_intervencion_tenant_fk",
    }),
    foreignKey({
      columns: [t.usuarioId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "revisiones_intervenciones_usuario_tenant_fk",
    }),
    politicaTenant("revisiones_de_intervenciones"),
  ],
).enableRLS();
