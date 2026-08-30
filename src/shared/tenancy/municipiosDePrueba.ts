import { randomUUID } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";
import { type AyuntamientoId, comoAyuntamientoId } from "./ayuntamientoId";
import { bitacora } from "./esquema";
import { withTenant } from "./withTenant";

/**
 * Siembra compartida de los tests de aislamiento.
 *
 * No es un `*.test.ts`, asi que vitest no lo recoge como suite. Vive aca y
 * no en una carpeta de fixtures porque los tests que lo usan estan al lado.
 */

export const motul = comoAyuntamientoId(randomUUID());
export const ticul = comoAyuntamientoId(randomUUID());
export const subdominioMotul = `motul-${motul.slice(0, 8)}`;
export const subdominioTicul = `ticul-${ticul.slice(0, 8)}`;

/**
 * Conexion con el rol owner. `xula_app` no tiene INSERT sobre
 * `ayuntamientos` a proposito: los municipios los da de alta el
 * SUPER_ADMIN, no la aplicacion del municipio.
 */
const urlOwner = process.env.MIGRATION_DATABASE_URL;
if (!urlOwner) throw new Error("Falta MIGRATION_DATABASE_URL para sembrar.");
export const owner = postgres(urlOwner, { max: 1 });

/**
 * Conexion con el rol de aplicacion SIN pasar por `withTenant`. Existe
 * solo para los tests: sirve para comprobar que una consulta sin tenant
 * fijado no ve nada. En produccion no hay equivalente.
 */
const urlApp = process.env.DATABASE_URL;
if (!urlApp) throw new Error("Falta DATABASE_URL.");
export const appSinTenant = postgres(urlApp, { max: 1, prepare: false });

export async function sembrar(): Promise<void> {
  await owner`
    INSERT INTO ayuntamientos (id, subdominio, nombre) VALUES
      (${motul}, ${subdominioMotul}, 'Motul'),
      (${ticul}, ${subdominioTicul}, 'Ticul')
  `;

  // La bitacora se siembra por `withTenant`, no con el rol owner. No es
  // comodidad: `bitacora` tiene FORCE sin excepcion para el dueno, asi que
  // el owner tampoco puede insertar ahi. La escribe la aplicacion o nadie.
  for (const ayuntamiento of [motul, ticul]) {
    await withTenant(ayuntamiento, (tx) =>
      tx.insert(bitacora).values({
        ayuntamientoId: ayuntamiento,
        accion: "emitir",
        entidad: "constancia",
      }),
    );
  }
}

export async function limpiar(): Promise<void> {
  // TRUNCATE y no DELETE. Con FORCE puesto, un `DELETE` del owner no
  // falla: RLS le esconde las filas y devuelve "DELETE 0", dejando la
  // tabla intacta y el test siguiente contaminado. TRUNCATE es operacion
  // de tabla, no de fila, y RLS no interviene.
  await owner`TRUNCATE bitacora, ayuntamientos CASCADE`;
}

/**
 * La segunda conexion, real e independiente, que necesita T6
 * (`constancias/folio.integration.test.ts`, design.md de
 * `constancias-oficios` seccion 4). Con `DB_POOL_MAX=1` en el proyecto
 * `integration`, dos `withTenant` disparados con `Promise.all` no se
 * cruzan: comparten la unica conexion del pool y se serializan solos,
 * mismo hallazgo que ya documenta `mudanzas.integration.test.ts:100-112`.
 * `appSinTenant` es un cliente `postgres()` propio, ajeno a ese pool, y
 * `begin()` mantiene la transaccion abierta mientras `trabajo` no resuelva
 * -es lo que le da al llamador el control de cuando hacer `COMMIT`-.
 *
 * Vive aca y no en el archivo de test: `scripts/reglas/reglas/tenancia.ts:43`
 * reconoce el andamiaje por el nombre del archivo
 * (`/DePrueba\.ts$|\.isolation\.test\.ts$/`), y un `*.integration.test.ts`
 * que importara `postgres` directo es el antipatron 2 de `AGENTS.md`.
 */
export async function enTransaccionParalela<T>(
  ayuntamientoId: AyuntamientoId,
  trabajo: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  // `begin` tipa su retorno como `UnwrapPromiseArray<T>`, pensado para
  // cuando `trabajo` devuelve un arreglo de promesas. Aca nunca es el
  // caso -`trabajo` siempre devuelve `T` a secas-, asi que el cast es
  // exacto y no un escape generico.
  return appSinTenant.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant', ${ayuntamientoId}, true)`;

    return trabajo(tx);
  }) as Promise<T>;
}

/**
 * Drizzle envuelve el error de Postgres en uno propio cuyo mensaje es
 * "Failed query: ..." y deja el motivo real en `cause`. Sin desenvolverlo,
 * un assert sobre el texto pasa o falla por razones que no tienen nada que
 * ver con lo que se quiere probar.
 */
export async function motivoDeFalla(
  trabajo: () => Promise<unknown>,
): Promise<string> {
  try {
    await trabajo();
  } catch (error) {
    const e = error as { message: string; cause?: { message?: string } };
    return e.cause?.message ?? e.message;
  }
  throw new Error("Se esperaba que fallara, y no fallo.");
}
