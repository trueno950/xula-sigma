import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { columnaTenant, politicaTenant } from "@/shared/tenancy/esquema";
import { ROLES, type Rol } from "./roles";

/**
 * Las cinco tablas de autenticacion. Cuatro son de Better Auth y la quinta
 * es nuestra (`intentos_acceso`, para la limitacion de ritmo). Venir de una
 * libreria no exime de nada: las cinco llevan `ayuntamiento_id`, `FORCE ROW
 * LEVEL SECURITY`, politica, `GRANT` y su test de aislamiento.
 *
 * **Nombres de tabla en español, campos de la libreria en ingles.**
 * `usuarios` ademas evita `"user"`, palabra reservada en Postgres.
 * Traducir los campos con `fields:` seria un mapa mas donde un desajuste
 * falla en runtime y en silencio.
 */

/** Las dos ventanas de la limitacion de ritmo se cuentan por separado. */
export const TIPOS_INTENTO = ["correo", "ip"] as const;
export type TipoIntento = (typeof TIPOS_INTENTO)[number];

/**
 * Un conjunto cerrado se declara **dos veces**: el `$type` lo cierra en
 * TypeScript y el CHECK en Postgres. No es redundancia — el `$type` se
 * evade con un cast, y la base es la reja que queda.
 */
const enumerado = (columna: string, valores: readonly string[]) =>
  sql.raw(`${columna} IN (${valores.map((v) => `'${v}'`).join(", ")})`);

/**
 * Personas que operan el sistema. El hash de la contrasenia **no vive
 * aca**: vive en `cuentas.password`, en la fila con
 * `providerId: "credential"`.
 *
 * `bajaEn` y nunca `DELETE`: se da de baja a una persona, no se la borra —
 * un borrado real deja huerfanas las constancias que firmo. La prohibicion
 * es la ausencia del GRANT, no una politica que alguien tenga que escribir.
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
    // Nulo mientras la persona sigue en el ayuntamiento.
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
     * Auth marca `email` como `unique: true` hardcodeado en
     * `get-tables.mjs:142`, pero su adaptador de Drizzle no emite DDL
     * (verificado: cero `CREATE TABLE` en su bundle), asi que ese `unique`
     * nunca llega a Postgres. La restriccion real es esta.
     */
    uniqueIndex("usuarios_tenant_email_idx").on(t.ayuntamientoId, t.email),
    check("usuarios_rol_valido", enumerado("rol", ROLES)),
    politicaTenant("usuarios"),
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
    userId: uuid()
      .notNull()
      .references(() => usuarios.id),
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
 * `drizzle-adapter/dist/index.mjs:286`) y el alta por correo no escribe
 * ninguna. El dia que entre OAuth, entra con sus columnas.
 */
export const cuentas = pgTable(
  "cuentas",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    userId: uuid()
      .notNull()
      .references(() => usuarios.id),
    accountId: text().notNull(),
    providerId: text().notNull(),
    // El hash argon2id. Nulo para proveedores que no usan contrasenia.
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("cuentas_tenant_idx").on(t.ayuntamientoId),
    politicaTenant("cuentas"),
  ],
).enableRLS();

/**
 * Tokens de un solo uso: restablecimiento de contrasenia, verificacion de
 * correo.
 *
 * **Es el caso duro del aislamiento.** No tiene `userId`, asi que su tenant
 * no se puede derivar por join: lo pone el hook `create.before` y lo obliga
 * la politica. Si el mecanismo fallara en alguna tabla, falla primero aca.
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

/**
 * Intentos de acceso, para la ventana corrediza de limitacion de ritmo.
 *
 * Se guarda `sha256(valor + pimienta)`, **nunca el correo ni la IP en
 * claro**: es una tabla de conteo, no un registro de quien intento entrar.
 *
 * **No existe columna `bloqueadoHasta`, y es a proposito.** Se limita el
 * ritmo, nunca se bloquea la cuenta: un bloqueo persistente se puede usar
 * para dejar afuera a un companiero justo el dia que hay que emitir. Sin la
 * columna, no se puede introducir por configuracion.
 */
export const intentosAcceso = pgTable(
  "intentos_acceso",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    clave: text().notNull(),
    // Un valor fuera del conjunto —`"email"`, `"IP"`— abriria una tercera
    // ventana que nadie cuenta: el limitador dejaria de limitar sin que
    // nada falle. De ahi el CHECK.
    tipo: text().$type<TipoIntento>().notNull(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("intentos_acceso_ventana_idx").on(
      t.ayuntamientoId,
      t.clave,
      t.ocurridoEn,
    ),
    check("intentos_acceso_tipo_valido", enumerado("tipo", TIPOS_INTENTO)),
    politicaTenant("intentos_acceso"),
  ],
).enableRLS();
