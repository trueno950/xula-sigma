import { sql } from "drizzle-orm";
import {
  char,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";

/**
 * `personas` no se reexporta desde ningun barrel del modulo. El porque
 * esta en `superficiePublica.test.ts`, que es lo que lo fija.
 */
export const personas = pgTable(
  "personas",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    nombres: text().notNull(),
    primerApellido: text().notNull(),
    segundoApellido: text(),
    /**
     * Sin default (decision 6 de proposal.md): la escribe la aplicacion.
     * `unaccent` no es IMMUTABLE (ADR 0002 seccion 6), asi que Postgres
     * rechaza tanto la columna generada como el indice de expresion. Un
     * INSERT que la olvide falla ruidoso aca, no guarda vacio.
     */
    nombreNormalizado: text().notNull(),
    curp: char({ length: 18 }),
    bajaEn: timestamp({ withTimezone: true }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("personas_tenant_idx").on(t.ayuntamientoId),
    /**
     * Destino de todo FK compuesto futuro hacia `personas` (decision 9 de
     * proposal.md): mismo patron que `usuarios_id_tenant_key`
     * (`shared/auth/esquema.ts:95`), que existe porque corrigio un bypass
     * real de RLS entre municipios — un FK simple sobre `id` deja pasar
     * una fila con su propio `ayuntamientoId` y un `personaId` ajeno.
     */
    unique("personas_id_tenant_key").on(t.id, t.ayuntamientoId),
    // Unica por municipio cuando existe. Por que "cuando existe" se
    // expresa con NULL y no con '': `domain/curp.ts`.
    uniqueIndex("personas_tenant_curp_idx").on(t.ayuntamientoId, t.curp),
    /**
     * GIN sobre trigramas (rebanada 3, `pg_trgm` ya viene de la migracion de
     * la rebanada 1). Sargabilidad de `%` y por que un `EXPLAIN` con RLS
     * activa no lo prueba: `buscarPersonas.integration.test.ts` y el
     * requisito "Busqueda tolerante a variantes con trigramas" del spec.
     */
    index("personas_nombre_normalizado_trgm_idx").using(
      "gin",
      sql`${t.nombreNormalizado} gin_trgm_ops`,
    ),
    politicaTenant("personas"),
  ],
).enableRLS();

/**
 * Catalogo de plataforma, no operativo: sin `ayuntamientoId` a proposito
 * (pregunta 2 de proposal.md). `ma` -> `maria` no cambia entre Motul y
 * Ticul. La excepcion a "toda tabla operativa lleva ayuntamiento_id" esta
 * en `AGENTS.md`, "Revision de migraciones SQL" — la lista de reglas, no
 * `invariantes-criticos.md`, que a proposito no la repite.
 *
 * Sin RLS: la proteccion de solo-lectura es el GRANT de la migracion —
 * `SELECT` para `xula_app`, sin `INSERT` ni `UPDATE` — no una politica.
 */
export const abreviaturas = pgTable("abreviaturas", {
  corta: text().primaryKey(),
  larga: text().notNull(),
});
