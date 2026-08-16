import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as esquema from "./esquema";

/**
 * La conexion vive en este archivo y no en uno propio a proposito.
 *
 * TypeScript no tiene visibilidad de modulo: todo lo que un archivo
 * necesita compartir con otro tiene que exportarlo, y una vez exportado lo
 * importa cualquiera. Un `conexion.ts` que exportara el manejador seria
 * una segunda puerta a la base, sin tenant fijado, disponible para todo el
 * sistema — por mas comentario que tuviera encima diciendo que no se use.
 *
 * Aca `bd` es una constante de modulo que nadie fuera puede alcanzar. La
 * unica salida es `withTenant`. El invariante lo sostiene el lenguaje, no
 * la disciplina de quien revisa.
 */

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "Falta DATABASE_URL. Es la conexion del rol de aplicacion, distinta " +
      "de MIGRATION_DATABASE_URL. Ver .env.example.",
  );
}

/**
 * `prepare: false` porque las sentencias preparadas viven en la conexion,
 * no en la transaccion. Con RLS eso es un riesgo real: un plan cacheado
 * puede haberse construido bajo otro `app.tenant`.
 */
const cliente = postgres(url, {
  max: Number(process.env.DB_POOL_MAX ?? 10),
  prepare: false,
});

const bd = drizzle(cliente, { schema: esquema, casing: "snake_case" });

export type TransaccionTenant = Parameters<
  Parameters<typeof bd.transaction>[0]
>[0];

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Ejecuta `trabajo` con el tenant fijado, dentro de una transaccion.
 *
 * Es el unico acceso a base de datos del sistema. Toda consulta sale de
 * adentro de esta funcion o no sale.
 *
 * @param ayuntamientoId Viene SIEMPRE del contexto resuelto en servidor.
 *   Nunca del body, del query string, ni de nada que el cliente controle.
 */
export async function withTenant<T>(
  ayuntamientoId: string,
  trabajo: (tx: TransaccionTenant) => Promise<T>,
): Promise<T> {
  // El valor termina dentro de una politica RLS. Validarlo antes de que
  // llegue ahi cuesta un regex y cierra la unica via por la que un valor
  // raro podria alterar la evaluacion de la politica.
  if (!UUID.test(ayuntamientoId)) {
    throw new Error(
      "ayuntamiento_id invalido: se esperaba un UUID. Este valor tiene que " +
        "venir del contexto de servidor, no de la peticion.",
    );
  }

  return bd.transaction(async (tx) => {
    /**
     * `set_config(..., true)` y no `SET LOCAL`, por dos razones distintas
     * y las dos importan:
     *
     * 1. El tercer argumento en `true` significa "local a la transaccion".
     *    Muere en el COMMIT o el ROLLBACK. Un `SET` suelto sobrevive a la
     *    transaccion, se queda pegado en la conexion del pool, y lo hereda
     *    el proximo request — que puede ser de otro municipio. Ese es el
     *    escenario T2 de los invariantes, y es una fuga silenciosa.
     *
     * 2. `SET LOCAL app.tenant = $1` no existe: la sintaxis SET no acepta
     *    parametros. Escribirlo obligaria a interpolar el valor en el
     *    texto de la sentencia. `set_config` es una funcion normal, asi
     *    que el valor viaja como parametro y nunca se concatena.
     */
    await tx.execute(
      sql`SELECT set_config('app.tenant', ${ayuntamientoId}, true)`,
    );

    return trabajo(tx);
  });
}

/**
 * Cierra el pool para que el proceso pueda terminar. En produccion el pool
 * vive lo que vive el contenedor; esto es para los tests.
 *
 * Cierra, no consulta: no abre ninguna ruta alternativa a la base.
 */
export async function cerrarConexion(): Promise<void> {
  await cliente.end();
}
