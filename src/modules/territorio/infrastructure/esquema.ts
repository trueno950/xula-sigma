import { isNull, sql } from "drizzle-orm";
import {
  check,
  date,
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
import type { CalleId, DomicilioId, LugarId, ResidenciaId } from "../domain";
import { calles, lugares } from "./esquemaDeCalles";

/**
 * Punto de entrada del esquema de `territorio` para `drizzle-kit`: el glob
 * de `drizzle.config.ts` solo alcanza archivos llamados `esquema.ts`, asi
 * que las tablas partidas en hermanos se reexportan aca.
 */
export { calles, eventosDeCalles, lugares } from "./esquemaDeCalles";
export { callesDeZonas } from "./esquemaDeCallesDeZonas";
export { zonas } from "./esquemaDeZonas";

export const domicilios = pgTable(
  "domicilios",
  {
    id: uuid().primaryKey().defaultRandom().$type<DomicilioId>(),
    ayuntamientoId: columnaTenant(),
    // Nivel de jerarquia conocido mas profundo (design.md decision 3):
    // no todo domicilio conoce su manzana.
    lugarId: uuid().notNull().$type<LugarId>(),
    calleId: uuid().notNull().$type<CalleId>(),
    // "S/N" es NULL, nunca la cadena literal (proposal.md decision 5).
    numero: text(),
    entreCalleAId: uuid().$type<CalleId>(),
    entreCalleBId: uuid().$type<CalleId>(),
    referencia: text(),
    // Baja logica, mismo criterio que `lugares`/`calles`: una direccion
    // corregida o mal capturada deja de leerse, no se borra.
    bajaEn: timestamp({ withTimezone: true }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("domicilios_tenant_idx").on(t.ayuntamientoId),
    unique("domicilios_id_tenant_key").on(t.id, t.ayuntamientoId),
    foreignKey({
      columns: [t.lugarId, t.ayuntamientoId],
      foreignColumns: [lugares.id, lugares.ayuntamientoId],
      name: "domicilios_lugar_tenant_fk",
    }),
    foreignKey({
      columns: [t.calleId, t.ayuntamientoId],
      foreignColumns: [calles.id, calles.ayuntamientoId],
      name: "domicilios_calle_tenant_fk",
    }),
    foreignKey({
      columns: [t.entreCalleAId, t.ayuntamientoId],
      foreignColumns: [calles.id, calles.ayuntamientoId],
      name: "domicilios_entre_calle_a_tenant_fk",
    }),
    foreignKey({
      columns: [t.entreCalleBId, t.ayuntamientoId],
      foreignColumns: [calles.id, calles.ayuntamientoId],
      name: "domicilios_entre_calle_b_tenant_fk",
    }),
    // Con una transversal nula la comparacion da NULL, y un CHECK solo
    // rechaza en FALSE: la fila pasa. Es lo que se quiere -las
    // transversales son nullable a proposito (proposal.md decision 5)- y
    // es un hecho de Postgres, no del archivo (design.md seccion 4).
    check(
      "domicilios_calles_distintas",
      sql`${t.calleId} <> ${t.entreCalleAId} AND ${t.calleId} <> ${t.entreCalleBId} AND ${t.entreCalleAId} <> ${t.entreCalleBId}`,
    ),
    index("domicilios_lugar_idx").on(t.ayuntamientoId, t.lugarId),
    index("domicilios_calle_idx").on(t.ayuntamientoId, t.calleId),
    politicaTenant("domicilios"),
  ],
).enableRLS();
export const residencias = pgTable(
  "residencias",
  {
    id: uuid().primaryKey().defaultRandom().$type<ResidenciaId>(),
    ayuntamientoId: columnaTenant(),
    // Sin `.references()` y sin `$type<PersonaId>()`: `personas` es
    // inalcanzable fuera de `padron` (design.md decision 4) y su tipo de
    // dominio tambien -- importarlo, aunque sea `import type` via el
    // barrel, es el antipatron 8 de `AGENTS.md` ("Importar modules/x/domain
    // desde otro modulo"), encontrado por GGA en la revision de esta
    // rebanada. `territorio` no valida ni interpreta este uuid; el FK
    // compuesto a mano en la cola de `drizzle/0007_territorio.sql` es la
    // unica proteccion, y es de Postgres, no de TypeScript.
    personaId: uuid().notNull(),
    domicilioId: uuid().notNull().$type<DomicilioId>(),
    // `date`, no `timestamptz`: fecha civil, no instante (design.md
    // seccion 8; `AGENTS.md` regla de fechas civiles).
    desdeEn: date().notNull(),
    hastaEn: date(),
    // Desempate cuando dos residencias abiertas comparten `desdeEn`
    // (design.md seccion 8).
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("residencias_tenant_idx").on(t.ayuntamientoId),
    foreignKey({
      columns: [t.domicilioId, t.ayuntamientoId],
      foreignColumns: [domicilios.id, domicilios.ayuntamientoId],
      name: "residencias_domicilio_tenant_fk",
    }),
    // A lo sumo una residencia abierta por persona. Builder de Drizzle,
    // nunca `sql\`...\``: un template que mencione `persona_id` dispara
    // `identidadPorPuerto.test.ts` (design.md seccion 5).
    uniqueIndex("residencias_una_abierta_idx")
      .on(t.ayuntamientoId, t.personaId)
      .where(isNull(t.hastaEn)),
    check(
      "residencias_vigencia",
      sql`${t.hastaEn} IS NULL OR ${t.hastaEn} >= ${t.desdeEn}`,
    ),
    politicaTenant("residencias"),
  ],
).enableRLS();
