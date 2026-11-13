import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";

/**
 * Tokens de un solo uso: restablecimiento de contrasenia, verificacion de
 * correo.
 *
 * **Es el caso duro del aislamiento.** Sin `userId` el tenant no se deriva
 * por join: lo pone el hook `verification.create.before` de `instancia.ts`
 * y lo obliga la politica. Si el mecanismo fallara en alguna tabla, falla
 * primero aca.
 *
 * Lo que todavia no existe es un flujo que **escriba** aca:
 * restablecimiento de contrasenia y verificacion de correo necesitan envio
 * de correo. La tabla esta creada y sin usar, asi que el hook no se
 * ejercita todavia (tarea 2.12b).
 *
 * Vive en su propio archivo, como `intentosAcceso`, porque `esquema.ts`
 * esta en el limite de las 200 lineas de `AGENTS.md`. Reexportada desde
 * ahi: `drizzle.config.ts` solo mira archivos llamados `esquema.ts`.
 */
export const verificaciones = pgTable(
  "verificaciones",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("verificaciones_tenant_idx").on(t.ayuntamientoId, t.identifier),
    politicaTenant("verificaciones"),
  ],
).enableRLS();
