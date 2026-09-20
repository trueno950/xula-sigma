import { isNull } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";
import type { LugarId, ZonaId } from "../domain";
import { lugares } from "./esquemaDeCalles";

export const zonas = pgTable(
  "zonas",
  {
    id: uuid().primaryKey().defaultRandom().$type<ZonaId>(),
    ayuntamientoId: columnaTenant(),
    lugarId: uuid().notNull().$type<LugarId>(),
    nombre: text().notNull(),
    bajaEn: timestamp({ withTimezone: true }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("zonas_tenant_idx").on(t.ayuntamientoId),
    unique("zonas_id_tenant_key").on(t.id, t.ayuntamientoId),
    unique("zonas_id_lugar_tenant_key").on(t.id, t.lugarId, t.ayuntamientoId),
    uniqueIndex("zonas_tenant_lugar_nombre_idx")
      .on(t.ayuntamientoId, t.lugarId, t.nombre)
      .where(isNull(t.bajaEn)),
    foreignKey({
      columns: [t.lugarId, t.ayuntamientoId],
      foreignColumns: [lugares.id, lugares.ayuntamientoId],
      name: "zonas_lugar_tenant_fk",
    }),
    politicaTenant("zonas"),
  ],
).enableRLS();
