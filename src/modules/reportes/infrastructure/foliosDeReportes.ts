import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";

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
