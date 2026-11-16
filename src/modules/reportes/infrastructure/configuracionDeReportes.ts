import { sql } from "drizzle-orm";
import { check, integer, pgTable } from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";
import { UMBRAL_DE_ATRASO_MAXIMO, UMBRAL_DE_ATRASO_MINIMO } from "../domain";

/**
 * El umbral de atraso de S1 de `gestion-municipal`, una fila por municipio -
 * la identidad es `ayuntamientoId`, sin `id` sustituto, mismo criterio que
 * `configuracion_de_documentos`-.
 *
 * Vive en su propia tabla y no en una columna de `ayuntamientos`: esa tabla
 * tiene lectura publica a proposito -el escudo del login se pinta antes de
 * que exista sesion- y la configuracion de la bandeja no tiene por que
 * heredarla. Un municipio sin fila usa el valor por defecto de
 * `UMBRAL_DE_ATRASO_POR_DEFECTO`; no hace falta sembrar la fila al dar de
 * alta el municipio.
 *
 * El CHECK repite en Postgres el rango de `esUmbralDeAtraso`: el `$type` del
 * caso de uso se evade con un `UPDATE` a mano, la base es la reja que queda.
 */
export const configuracionDeReportes = pgTable(
  "configuracion_de_reportes",
  {
    ayuntamientoId: columnaTenant().primaryKey(),
    diasDeAtraso: integer().notNull(),
  },
  (t) => [
    // `sql.raw` y no la interpolacion normal: drizzle-kit serializa los
    // valores interpolados como parametros (`BETWEEN $1 AND $2`) y una
    // migracion no puede llevar parametros. Los dos numeros son constantes
    // del codigo, no entrada de nadie.
    check(
      "configuracion_de_reportes_umbral_en_rango",
      sql`${t.diasDeAtraso} BETWEEN ${sql.raw(String(UMBRAL_DE_ATRASO_MINIMO))} AND ${sql.raw(String(UMBRAL_DE_ATRASO_MAXIMO))}`,
    ),
    politicaTenant("configuracion_de_reportes"),
  ],
).enableRLS();
