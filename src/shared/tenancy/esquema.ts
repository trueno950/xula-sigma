import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AyuntamientoId } from "./ayuntamientoId";

/**
 * El tenant activo de la transaccion. Lo fija `withTenant` con
 * `set_config('app.tenant', ..., true)`, donde el `true` significa "local
 * a la transaccion".
 *
 * El segundo argumento de `current_setting` en `true` hace que devuelva
 * NULL en vez de reventar cuando la variable nunca se fijo. Sin tenant,
 * `ayuntamiento_id = NULL` es NULL, que no es TRUE, y la politica no deja
 * pasar ninguna fila. Fallar cerrado.
 *
 * El NULLIF no es decorativo. Verificado contra Postgres 18: cuando una
 * transaccion fija la variable con `set_config(..., true)` y termina, el
 * valor NO vuelve a NULL — vuelve a CADENA VACIA. Y `''::uuid` lanza
 * "invalid input syntax for type uuid".
 *
 * O sea que sin el NULLIF, toda consulta que salga fuera de `withTenant`
 * por una conexion del pool ya usada revienta al evaluar la politica. No
 * hay fuga, pero es un error latente que aparece recien en produccion,
 * cuando el pool empieza a reciclar conexiones.
 *
 * **Se exporta para que `shared/auth/esquema.ts` lo reuse.** Duplicar el
 * fragmento seria duplicar la sutileza del NULLIF, que es exactamente lo
 * que no puede divergir entre dos archivos. La direccion es `auth →
 * tenancy` y nunca al reves.
 */
export const tenantActual = sql`NULLIF(current_setting('app.tenant', true), '')::uuid`;

/**
 * Registro de ayuntamientos. Es la tabla raiz del tenant: su `id` es el
 * `ayuntamiento_id` que llevan todas las demas.
 */
export const ayuntamientos = pgTable(
  "ayuntamientos",
  {
    // `$type` propaga la marca hasta el resultado de la consulta: lo que
    // sale de Drizzle ya es `AyuntamientoId`, no un string que alguien
    // tenga que acordarse de convertir.
    id: uuid().primaryKey().defaultRandom().$type<AyuntamientoId>(),
    // Resuelve el tenant en `proxy.ts` a partir del subdominio.
    subdominio: text().notNull().unique(),
    nombre: text().notNull(),
    // Escudo, logotipo y paleta. Los assets son URLs a R2, nunca rutas
    // del filesystem del contenedor.
    marca: jsonb().notNull().default({}),
    // `altaEn` y no `activo`: es la fecha en que el municipio entro al
    // sistema. Un nombre como `activo` hace esperar un booleano.
    altaEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /**
     * La fila reservada donde vive el `SUPER_ADMIN`. **No es un municipio**:
     * por que existe y por que se excluye del directorio esta en
     * `plataformaReservada.isolation.test.ts`, que es donde se prueba.
     *
     * Columna y no subdominio reservado por constante: un `subdominio <>
     * 'plataforma'` disperso por las consultas es una convencion de
     * nombres, y se olvida en la proxima.
     */
    esPlataforma: boolean().notNull().default(false),
  },
  (t) => [
    // Indice parcial sobre una constante: la segunda fila con
    // `es_plataforma = true` choca contra el unique. Un seed corrido dos
    // veces deja dos plataformas, y ninguna de las dos resuelve.
    uniqueIndex("ayuntamientos_una_plataforma")
      .on(sql`(true)`)
      .where(sql`${t.esPlataforma}`),
    // El `SUPER_ADMIN` crea municipios, nunca una segunda plataforma.
    pgPolicy("ayuntamientos_alta_plataforma", {
      for: "insert",
      to: "xula_super_admin",
      withCheck: sql`NOT ${t.esPlataforma}`,
    }),
    /**
     * Lectura abierta, y es a proposito.
     *
     * `ticul.xulasigma.mx` tiene que pintar el escudo de Ticul en la
     * pantalla de login, o sea antes de que exista sesion y por lo tanto
     * antes de que exista tenant. Nombre, subdominio y marca de un
     * municipio son publicos: estan en la fachada del palacio.
     *
     * Lo que nunca se expone es la operacion, y esa vive en las otras
     * tablas, donde la politica si filtra por tenant.
     */
    pgPolicy("ayuntamientos_directorio_publico", {
      for: "select",
      to: "xula_app",
      using: sql`true`,
    }),
    /**
     * Escribir, solo sobre el propio registro. Un admin de Motul no
     * cambia el escudo de Ticul.
     */
    pgPolicy("ayuntamientos_escritura_propia", {
      for: "update",
      to: "xula_app",
      using: sql`id = ${tenantActual}`,
      withCheck: sql`id = ${tenantActual}`,
    }),
  ],
).enableRLS();

/**
 * Bitacora de auditoria transversal. Es de solo agregado: el `GRANT` de
 * la migracion da SELECT e INSERT y nada mas, asi que el UPDATE y el
 * DELETE no se bloquean con una politica sino con la ausencia del
 * permiso. Un permiso que no existe no se puede olvidar de revisar.
 */
export const bitacora = pgTable(
  "bitacora",
  {
    id: uuid().primaryKey().defaultRandom(),
    ayuntamientoId: columnaTenant(),
    // Nulo cuando la accion la origina el sistema, no una persona.
    actor: uuid(),
    accion: text().notNull(),
    entidad: text().notNull(),
    entidadId: uuid(),
    // Origen de la peticion. Nunca datos personales: ver ADR 0001
    // seccion 5 para la lista de lo que no se registra.
    origen: text(),
    ocurridoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bitacora_tenant_idx").on(t.ayuntamientoId, t.ocurridoEn),
    politicaTenant("bitacora"),
    /**
     * El alta de un municipio deja su traza en la misma transaccion, y esa
     * la escribe `xula_super_admin`. Solo INSERT: la bitacora no le da
     * SELECT a nadie fuera de su municipio, ni siquiera a quien la escribio.
     */
    pgPolicy("bitacora_alta_plataforma", {
      for: "insert",
      to: "xula_super_admin",
      withCheck: sql`ayuntamiento_id = ${tenantActual}`,
    }),
  ],
).enableRLS();

/**
 * La columna y la politica que repite **toda** tabla operativa del
 * sistema, sin excepcion. Viven aca y no en cada esquema porque son la
 * forma de un invariante, no una comodidad: el dia que cambie, cambia en
 * un lugar.
 *
 * Se declaran despues de `ayuntamientos` porque `columnaTenant` la
 * referencia.
 */
export function columnaTenant() {
  return uuid()
    .notNull()
    .$type<AyuntamientoId>()
    .references(() => ayuntamientos.id);
}

/**
 * CHECK que cierra una columna a un conjunto de valores.
 *
 * Un conjunto cerrado se declara **dos veces**: el `$type` lo cierra en
 * TypeScript y este CHECK en Postgres. No es redundancia — el `$type` se
 * evade con un cast, y la base es la reja que queda.
 */
export const enumerado = (columna: string, valores: readonly string[]) =>
  sql.raw(`${columna} IN (${valores.map((v) => `'${v}'`).join(", ")})`);

export function politicaTenant(tabla: string) {
  return pgPolicy(`${tabla}_tenant`, {
    for: "all",
    to: "xula_app",
    using: sql`ayuntamiento_id = ${tenantActual}`,
    // Sin `withCheck` se podria insertar una fila con el `ayuntamiento_id`
    // de otro municipio, que despues no se veria desde ningun lado. Una
    // fuga que ni siquiera se nota.
    withCheck: sql`ayuntamiento_id = ${tenantActual}`,
  });
}
