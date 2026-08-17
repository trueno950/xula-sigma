import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";
import { tenantActual } from "@/shared/tenancy/esquema";

/**
 * Lo que `xula_super_admin` puede tocar de las tablas de auth, y nada mas.
 *
 * Viven aparte de `esquema.ts` por el mismo motivo que `politicaTenant` vive
 * en `tenancy/esquema.ts`: son la forma de una decision —el `SUPER_ADMIN` no
 * es llave maestra— y no una propiedad de cada tabla. Juntas ademas empujaban
 * `esquema.ts` por encima de las 200 lineas.
 *
 * **El limite lo pone Postgres, no el caso de uso.** Un `if` en TypeScript lo
 * evade quien escriba otro camino de alta; un `WITH CHECK` no. Los tests que
 * las provocan estan en `tenancy/superAdminAcotado.isolation.test.ts`.
 */

/** La subconsulta que ata una credencial al rol de su duenio. */
const esDelAdministrador = sql`EXISTS (
  SELECT 1 FROM usuarios u
   WHERE u.id = cuentas.user_id AND u.rol = 'ADMIN_MUNICIPAL'
)`;

/**
 * Crea **solo** el primer `ADMIN_MUNICIPAL` de un municipio. Si pudiera
 * crear un `OPERADOR`, tendria una cuenta operativa en cada ayuntamiento.
 */
export const altaDelPrimerAdministrador = () =>
  pgPolicy("usuarios_alta_admin", {
    for: "insert",
    to: "xula_super_admin",
    withCheck: sql`ayuntamiento_id = ${tenantActual} AND rol = 'ADMIN_MUNICIPAL'`,
  });

/**
 * Lectura acotada a la misma fila que puede crear.
 *
 * Hace falta por dos motivos y ninguno es comodidad: `INSERT ... RETURNING`
 * aplica tambien las politicas de SELECT, y la subconsulta de
 * `cuentas_restablece_admin` necesita leer `rol`. Fuera de esos dos usos no
 * ve a nadie — ni un `OPERADOR`, ni una persona de otro municipio, ni las
 * columnas `name` y `baja_en`, que el GRANT por columna deja afuera.
 */
export const lecturaDelPrimerAdministrador = () =>
  pgPolicy("usuarios_lectura_admin", {
    for: "select",
    to: "xula_super_admin",
    using: sql`ayuntamiento_id = ${tenantActual} AND rol = 'ADMIN_MUNICIPAL'`,
  });

/** La credencial del primer administrador, en el alta del municipio. */
export const altaDeCredencialDelAdministrador = () =>
  pgPolicy("cuentas_alta_admin", {
    for: "insert",
    to: "xula_super_admin",
    withCheck: sql`ayuntamiento_id = ${tenantActual} AND ${esDelAdministrador}`,
  });

/**
 * Destrabar al `ADMIN_MUNICIPAL` que quedo afuera. Es el unico caso en que
 * la plataforma toca datos de un municipio, y por eso el `USING` repite el
 * `EXISTS`: sin el, un `UPDATE` sin `WHERE` cambiaria la credencial de cada
 * persona del municipio.
 */
export const restablecimientoDelAdministrador = () =>
  pgPolicy("cuentas_restablece_admin", {
    for: "update",
    to: "xula_super_admin",
    using: sql`ayuntamiento_id = ${tenantActual} AND ${esDelAdministrador}`,
    withCheck: sql`ayuntamiento_id = ${tenantActual}`,
  });
