import { and, eq, not, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type AyuntamientoId, esAyuntamientoId } from "./ayuntamientoId";
import * as esquema from "./esquema";
import { ayuntamientos } from "./esquema";
import { type FilaDeRol, problemaDeRol } from "./rolDeAplicacion";

/**
 * La conexion vive en este archivo y no en uno propio a proposito.
 *
 * TypeScript no tiene visibilidad de modulo: todo lo que un archivo
 * necesita compartir con otro tiene que exportarlo, y una vez exportado lo
 * importa cualquiera. Un `conexion.ts` que exportara el manejador seria
 * otra puerta a la base, sin tenant fijado, disponible para todo el
 * sistema — por mas comentario que tuviera encima diciendo que no se use.
 *
 * Aca `bd` y `cliente` son constantes de modulo que nadie fuera puede
 * alcanzar: se sale por las funciones que este archivo exporta y por
 * ninguna otra. Cuales son y por que vive en la regla 2 de `AGENTS.md`, no
 * aca. El invariante lo sostiene el lenguaje, no la disciplina de quien
 * revisa.
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

/**
 * Se verifica una vez por proceso y no en el ambito del modulo: `next build`
 * evalua el tope de los modulos alcanzables, y tirar ahi rompe la
 * compilacion en vez de la peticion. Perezoso, memoizado, y si falla queda
 * fallando — una promesa rechazada cacheada es exactamente lo que se
 * quiere: que no sirva ni un request mas.
 *
 * Por que hace falta y por que no alcanza un test: `rolDeAplicacion.ts`.
 */
let rolVerificado: Promise<void> | null = null;

const exigirRolSinPrivilegios = async (): Promise<void> => {
  const [fila] = await cliente<FilaDeRol[]>`
    SELECT current_user AS usuario, rolsuper, rolbypassrls
      FROM pg_roles
     WHERE rolname = current_user
  `;

  const problema = problemaDeRol(fila);

  if (problema) throw new Error(problema);
};

const conRolVerificado = (): Promise<void> => {
  rolVerificado ??= exigirRolSinPrivilegios();

  return rolVerificado;
};

export type TransaccionTenant = Parameters<
  Parameters<typeof bd.transaction>[0]
>[0];

/**
 * El acceso a base de datos de **toda la operacion**: si hay un tenant, la
 * consulta sale de adentro de esta funcion o no sale.
 *
 * Este comentario ya afirmo ser el unico acceso del sistema, y cada vez que
 * entro una salida nueva quedo viejo sin que fallara nada. Por eso no
 * enumera ni cuenta: la lista vive donde dice el encabezado del archivo.
 *
 * @param ayuntamientoId Viene SIEMPRE del contexto resuelto en servidor
 *   (ver `ayuntamientoId.ts`).
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

  await conRolVerificado();

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
 * Resuelve un ayuntamiento por su subdominio. Corre sin tenant fijado, y
 * tiene que ser asi: el tenant se resuelve en el borde del request, antes
 * de que exista uno.
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
 *
 * **Excluye la fila reservada de plataforma.** No es un municipio: es donde
 * vive la identidad del `SUPER_ADMIN` (diseno seccion 10). Sin este filtro
 * su subdominio resolveria, `proxy.ts` la trataria como un ayuntamiento mas
 * y le pintaria pantalla de acceso a cualquiera que la escriba en la barra.
 * `plataformaReservada.isolation.test.ts` lo provoca.
 */
export async function resolverAyuntamientoPorSubdominio(
  subdominio: string,
): Promise<AyuntamientoResuelto | null> {
  await conRolVerificado();

  const [fila] = await bd
    .select({
      id: ayuntamientos.id,
      subdominio: ayuntamientos.subdominio,
      nombre: ayuntamientos.nombre,
      marca: ayuntamientos.marca,
    })
    .from(ayuntamientos)
    .where(
      and(
        eq(ayuntamientos.subdominio, subdominio),
        not(ayuntamientos.esPlataforma),
      ),
    )
    .limit(1);

  return fila ?? null;
}

/**
 * Para los tests: en produccion el pool vive lo que vive el contenedor.
 * Cierra, no consulta — no abre una ruta alternativa a la base.
 */
export async function cerrarConexion(): Promise<void> {
  await cliente.end();
}
