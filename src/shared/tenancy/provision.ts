import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type AyuntamientoId, comoAyuntamientoId } from "./ayuntamientoId";
import * as esquema from "./esquema";
import { ayuntamientos, bitacora } from "./esquema";
import type { TransaccionTenant } from "./withTenant";

/**
 * La segunda puerta a la base, y la ultima.
 *
 * **No es una excepcion al invariante de una sola puerta**, y conviene ver
 * por que. `withTenant` es la puerta de la operacion: entra con un tenant
 * ya resuelto y corre bajo `xula_app`. Esta es la puerta del alta, donde el
 * tenant todavia no existe —se esta creando— y corre bajo otro rol de
 * Postgres con otros privilegios. Son dos superficies distintas con dos
 * conjuntos de politicas distintos, no la misma superficie con un atajo.
 *
 * Lo que si comparte es la forma: la conexion es una constante privada de
 * modulo que nadie fuera puede alcanzar, y la unica salida es esta funcion.
 * Un `conexion.ts` que exportara el manejador seria una puerta sin tenant
 * disponible para todo el sistema, por mas comentario que tuviera encima.
 *
 * Y lo que hace fuerte a esta parte es que **el limite lo pone Postgres, no
 * este archivo**: `xula_super_admin` no puede crear un `OPERADOR`, no puede
 * restablecerle la contrasenia a nadie que no sea el `ADMIN_MUNICIPAL`, y
 * no tiene `SELECT` sobre `ayuntamientos`.
 *
 * Sobre `usuarios` **si tiene**, y conviene decirlo con precision en vez de
 * afirmar que no ve nada: `GRANT SELECT` de cuatro columnas —`id`,
 * `ayuntamiento_id`, `rol`, `email`— acotado ademas por
 * `usuarios_lectura_admin` al tenant actual y a `rol = 'ADMIN_MUNICIPAL'`.
 * No es comodidad: `INSERT ... RETURNING` aplica tambien las politicas de
 * SELECT, y la subconsulta de `cuentas_restablece_admin` necesita leer
 * `rol`. Quedan afuera `name` y `baja_en`, y cualquier persona que no sea
 * el administrador.
 *
 * Las politicas estan en `0002_super_admin.sql`; los tests que las provocan
 * en `provision.isolation.test.ts` y en `superAdminAcotado.isolation.test.ts`.
 */

const url = process.env.SUPER_ADMIN_DATABASE_URL;

if (!url) {
  throw new Error(
    "Falta SUPER_ADMIN_DATABASE_URL. Es la conexion del rol que da de alta " +
      "municipios, distinta de DATABASE_URL y de MIGRATION_DATABASE_URL. " +
      "Ver .env.example.",
  );
}

/** `prepare: false` por lo mismo que en `withTenant.ts`: planes y RLS. */
const cliente = postgres(url, { max: 1, prepare: false });

const bd = drizzle(cliente, { schema: esquema, casing: "snake_case" });

/**
 * Da de alta un ayuntamiento y todo lo que necesita para existir, en una
 * sola transaccion.
 *
 * No recibe `esPlataforma`: la fila reservada de plataforma se siembra a
 * mano una vez por entorno, fuera de este camino. La politica
 * `ayuntamientos_alta_plataforma` lo niega igual aunque alguien encuentre
 * como pedirlo — la firma es la comodidad, la politica es la garantia.
 *
 * @param trabajo Recibe el `tx` y el id recien creado. Aca adentro va el
 *   primer `ADMIN_MUNICIPAL`. **No lo llama `provision.ts`**:
 *   `shared/tenancy` no puede importar `shared/auth` —la direccion es
 *   `auth → tenancy` y nunca al reves— asi que quien compone el alta
 *   completa es el caso de uso, no esta funcion. La traza en bitacora **no**
 *   va aca: la escribe el alta misma, mas abajo, para que no dependa de que
 *   cada llamador se acuerde.
 */
export async function withAltaDeAyuntamiento<T>(
  datos: { subdominio: string; nombre: string },
  trabajo: (tx: TransaccionTenant, id: AyuntamientoId) => Promise<T>,
): Promise<T> {
  /**
   * El id se genera aca y no con `DEFAULT gen_random_uuid()` a proposito:
   * leerlo de vuelta pediria `INSERT ... RETURNING`, y eso exige `SELECT`
   * sobre `ayuntamientos`. Sin ese GRANT, el rol puede crear municipios
   * pero no recorrer el directorio de los que ya existen.
   */
  const id = comoAyuntamientoId(randomUUID());

  return bd.transaction(async (tx) => {
    await tx.insert(ayuntamientos).values({
      id,
      subdominio: datos.subdominio,
      nombre: datos.nombre,
    });

    /**
     * El tenant se fija **despues** del INSERT: antes no existe la fila a
     * la que apunta. De aca en adelante `trabajo` corre con el mismo
     * `app.tenant` que tendria un request de ese municipio, asi que las
     * politicas de `usuarios` y `cuentas` evaluan lo mismo que evaluarian
     * en produccion.
     */
    await tx.execute(sql`SELECT set_config('app.tenant', ${id}, true)`);

    /**
     * La traza la escribe el alta y no el llamador.
     *
     * Es la unica forma de que exista siempre: dejarsela a quien compone el
     * alta significa que el dia que uno se olvide, no falla nada y queda un
     * municipio sin registro de haber sido creado. La escribe
     * `xula_super_admin` por `bitacora_alta_plataforma`, que le da INSERT y
     * nada mas — ni siquiera puede volver a leer lo que acaba de escribir.
     *
     * `actor` queda nulo, que es lo que el esquema reserva para lo que
     * origina el sistema: en este punto no hay persona identificada. El
     * primer `ADMIN_MUNICIPAL` todavia no existe —lo crea `trabajo`, despues
     * de esta linea— y la plataforma no llega hasta aca con una sesion. El
     * dia que el provisionamiento tenga un caso de uso con contexto, el
     * actor sale de ahi.
     */
    await tx.insert(bitacora).values({
      ayuntamientoId: id,
      accion: "ALTA_AYUNTAMIENTO",
      entidad: "ayuntamientos",
      entidadId: id,
    });

    return trabajo(tx as TransaccionTenant, id);
  });
}

/** Para los tests, igual que `cerrarConexion`. Cierra, no consulta. */
export async function cerrarProvision(): Promise<void> {
  await cliente.end();
}
