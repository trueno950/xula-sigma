import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
import {
  altaDeCredencialDelAdministrador,
  altaDelPrimerAdministrador,
  lecturaDelPrimerAdministrador,
  restablecimientoDelAdministrador,
} from "./politicasPlataforma";
import { ROLES, type Rol } from "./roles";

/**
 * Reexportado, y no por comodidad: `drizzle.config.ts` solo mira archivos
 * llamados `esquema.ts`. Una tabla definida en otro archivo existe en
 * TypeScript y **nunca llega a la migracion** — se comprobo: `db:generate`
 * anuncio "6 tables" en vez de 7 y siguio sin error.
 */
export {
  intentosAcceso,
  TIPOS_INTENTO,
  type TipoIntento,
} from "./intentosAcceso";
export { verificaciones } from "./verificaciones";

/**
 * Las cuatro tablas que impone Better Auth. La quinta —`intentos_acceso`,
 * que es nuestra— vive en su propio archivo. Venir de una libreria no
 * exime del aislamiento.
 *
 * Nombres de tabla en espanol, campos de la libreria en ingles. El motivo
 * y como las alcanza el adaptador estan en `configuracion.ts`, sobre
 * `MODELOS`; aca solo se usan.
 *
 * `sesiones` y `cuentas` cuelgan de `usuarios` por FK **compuesta**
 * `(user_id, ayuntamiento_id)`, no por `user_id` solo. Con la FK simple,
 * una fila con `ayuntamiento_id` propio y `user_id` ajeno pasa el
 * `WITH CHECK` de RLS —que solo mira el tenant de la fila— y la base la
 * acepta. Verificado: entraba.
 */

/**
 * Personas que operan el sistema. El hash de la contrasenia **no vive
 * aca**: vive en `cuentas.password`, en la fila con
 * `providerId: "credential"`.
 *
 * `bajaEn` y nunca `DELETE`. Los GRANT de las cinco tablas no son
 * uniformes y `0001_auth.sql` explica cada diferencia.
 */
export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Frontera de autorizacion. Como texto libre, un `"Operador"` mal
    // tipeado no falla: crea una persona con permisos equivocados y nadie
    // se entera.
    rol: text().$type<Rol>().notNull(),
    bajaEn: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usuarios_tenant_idx").on(t.ayuntamientoId),
    /**
     * Unicidad **compuesta**, no global.
     *
     * El mismo correo en dos municipios son dos personas distintas. Better
     * Auth marca `email` como `unique: true` hardcodeado
     * (`get-tables.mjs:142` en 1.6.29), pero su adaptador de Drizzle no
     * emite DDL —cero `CREATE TABLE` en su bundle—, asi que ese `unique`
     * nunca llega a Postgres. La restriccion real es esta.
     */
    uniqueIndex("usuarios_tenant_email_idx").on(t.ayuntamientoId, t.email),
    /**
     * La unicidad que de verdad cierra la carrera entre `Ana@motul.mx` y
     * `ana@motul.mx`: compara por `lower(email)` y el limite lo pone
     * Postgres, no el codigo. Por que el indice de arriba no alcanza esta
     * en `drizzle/0024_usuarios_email_lower_unico.sql`.
     */
    uniqueIndex("usuarios_tenant_email_lower_idx").on(
      t.ayuntamientoId,
      sql`lower(${t.email})`,
    ),
    check("usuarios_rol_valido", enumerado("rol", ROLES)),
    // Destino de las FK compuestas de `sesiones` y `cuentas`. Postgres
    // exige una restriccion UNIQUE sobre las columnas referenciadas; con
    // `id` ya siendo PK, esta no restringe nada nuevo.
    unique("usuarios_id_tenant_key").on(t.id, t.ayuntamientoId),
    politicaTenant("usuarios"),
    altaDelPrimerAdministrador(),
    lecturaDelPrimerAdministrador(),
  ],
).enableRLS();

/**
 * Sesiones activas. El `token` es unico en toda la base, no por municipio:
 * es un valor aleatorio y una colision entre municipios seria justamente el
 * cruce que no queremos. RLS igual esconde la fila del otro tenant.
 */
export const sesiones = pgTable(
  "sesiones",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    userId: uuid().notNull(),
    token: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sesiones_tenant_idx").on(t.ayuntamientoId),
    uniqueIndex("sesiones_token_idx").on(t.token),
    foreignKey({
      columns: [t.userId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "sesiones_usuario_tenant_fk",
    }),
    politicaTenant("sesiones"),
  ],
).enableRLS();

/**
 * Credenciales. Una fila por proveedor y usuario; con solo correo y
 * contrasenia hay una sola, con `providerId: "credential"`.
 *
 * **Sin las columnas de OAuth** (`accessToken`, `refreshToken`, `idToken`,
 * `scope`, los dos `expiresAt` de token). Better Auth las declara en su
 * modelo `account`, pero su adaptador solo valida los campos que
 * **escribe** (`checkMissingFields` recorre `values`, no el modelo —
 * `drizzle-adapter/dist/index.mjs:286` en 1.6.29) y el alta por correo no
 * escribe ninguna. El dia que entre OAuth, entra con sus columnas.
 */
export const cuentas = pgTable(
  "cuentas",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    userId: uuid().notNull(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    // El hash argon2id, no la contrasenia. El nombre lo impone el modelo
    // de Better Auth; renombrarlo obligaria a un mapa de campos.
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cuentas_tenant_idx").on(t.ayuntamientoId),
    foreignKey({
      columns: [t.userId, t.ayuntamientoId],
      foreignColumns: [usuarios.id, usuarios.ayuntamientoId],
      name: "cuentas_usuario_tenant_fk",
    }),
    politicaTenant("cuentas"),
    altaDeCredencialDelAdministrador(),
    restablecimientoDelAdministrador(),
  ],
).enableRLS();
