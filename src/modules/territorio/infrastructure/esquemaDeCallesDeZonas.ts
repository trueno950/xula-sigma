import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";
import type { CalleId, LugarId, ZonaId } from "../domain";
import { calles } from "./esquemaDeCalles";
import { zonas } from "./esquemaDeZonas";

export const callesDeZonas = pgTable(
  "calles_de_zonas",
  {
    zonaId: uuid().notNull().$type<ZonaId>(),
    calleId: uuid().notNull().$type<CalleId>(),
    ayuntamientoId: columnaTenant(),
    lugarId: uuid().notNull().$type<LugarId>(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      columns: [t.zonaId, t.calleId],
      name: "calles_de_zonas_pk",
    }),
    index("zonas_calles_zona_idx").on(t.ayuntamientoId, t.zonaId),
    index("zonas_calles_calle_idx").on(t.ayuntamientoId, t.calleId),
    foreignKey({
      columns: [t.zonaId, t.lugarId, t.ayuntamientoId],
      foreignColumns: [zonas.id, zonas.lugarId, zonas.ayuntamientoId],
      name: "calles_de_zonas_zona_tenant_fk",
    }),
    foreignKey({
      columns: [t.calleId, t.lugarId, t.ayuntamientoId],
      foreignColumns: [calles.id, calles.lugarId, calles.ayuntamientoId],
      name: "calles_de_zonas_calle_tenant_fk",
    }),
    politicaTenant("calles_de_zonas"),
  ],
).enableRLS();
