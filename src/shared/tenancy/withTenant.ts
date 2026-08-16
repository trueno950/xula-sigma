import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type AyuntamientoId, esAyuntamientoId } from "./ayuntamientoId";
import * as esquema from "./esquema";
import { ayuntamientos } from "./esquema";

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
  ayuntamientoId: AyuntamientoId,
  trabajo: (tx: TransaccionTenant) => Promise<T>,
): Promise<T> {
  // El tipo ya obliga a que haya pasado por `comoAyuntamientoId`. Se
  // revalida igual porque la marca se evade con un cast, y el valor
  // termina dentro de una politica RLS. Cuesta un regex.
  if (!esAyuntamientoId(ayuntamientoId)) {
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

/** Lo que el directorio publico expone de un ayuntamiento. */
export type AyuntamientoResuelto = {
  id: AyuntamientoId;
  subdominio: string;
  nombre: string;
  marca: unknown;
};

/**
 * Resuelve un ayuntamiento por su subdominio. **Es la unica consulta del
 * sistema que corre sin tenant fijado**, y tiene que serlo: el tenant se
 * resuelve en el borde del request, antes de que exista uno.
 *
 * No es un agujero en el invariante, y conviene ver por que:
 *
 * - La politica `ayuntamientos_directorio_publico` permite este SELECT sin
 *   tenant a proposito. `ticul.xulasigma.mx` tiene que pintar el escudo de
 *   Ticul en la pantalla de login, o sea antes de que haya sesion.
 * - Cualquier otra tabla, por la misma conexion sin tenant, devuelve cero
 *   filas: el `NULLIF` deja NULL y la politica no deja pasar nada. La
 *   seguridad no depende de que esta funcion se porte bien; la da RLS.
 *
 * Las columnas se listan una por una y no se usa `select()` pelado. Es
 * deliberado: el dia que `ayuntamientos` gane una columna sensible, no se
 * cuela sola a una superficie que se sirve antes de autenticar.
 */
export async function resolverAyuntamientoPorSubdominio(
  subdominio: string,
): Promise<AyuntamientoResuelto | null> {
  const [fila] = await bd
    .select({
      id: ayuntamientos.id,
      subdominio: ayuntamientos.subdominio,
      nombre: ayuntamientos.nombre,
      marca: ayuntamientos.marca,
    })
    .from(ayuntamientos)
    .where(eq(ayuntamientos.subdominio, subdominio))
    .limit(1);

  return fila ?? null;
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
