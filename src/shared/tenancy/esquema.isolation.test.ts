import postgres from "postgres";
import { afterAll, expect, it } from "vitest";

/**
 * T4 — una tabla nueva sin RLS rompe el build.
 *
 * Este test no mira nuestro codigo: le pregunta a Postgres por el estado
 * real del esquema. Es la unica forma de que la regla sobreviva a alguien
 * — persona o IA — que agregue una tabla y se olvide de la politica.
 *
 * Por que solo vigila RLS y no el GRANT: son asimetricos. Olvidar el GRANT
 * revienta con "permission denied" en el primer request contra la tabla,
 * ruidoso e inmediato. Olvidar RLS no rompe nada hasta que entra el segundo
 * municipio, y para entonces ya hubo fuga. Ver ADR 0001 seccion 2.
 */

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("Falta MIGRATION_DATABASE_URL.");
const owner = postgres(url, { max: 1 });

afterAll(async () => {
  await owner.end();
});

it("toda tabla con ayuntamiento_id tiene RLS habilitado y forzado", async () => {
  const desprotegidas = await owner<
    { tabla: string; enable: boolean; force: boolean }[]
  >`
    SELECT c.relname            AS tabla,
           c.relrowsecurity     AS enable,
           c.relforcerowsecurity AS force
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND (
         EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'public'
              AND col.table_name = c.relname
              AND col.column_name = 'ayuntamiento_id'
         )
         -- La tabla raiz del tenant no tiene ayuntamiento_id: su id ES el
         -- ayuntamiento_id. Se incluye a mano o quedaria fuera del barrido.
         OR c.relname = 'ayuntamientos'
       )
       AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
  `;

  // El mensaje nombra las tablas: quien rompa esto tiene que saber cual es
  // sin ir a leer el test.
  expect(
    desprotegidas.map(
      (t) => `${t.tabla} (enable=${t.enable}, force=${t.force})`,
    ),
  ).toEqual([]);
});

it("ninguna tabla con ayuntamiento_id se quedo sin politica", async () => {
  const sinPolitica = await owner<{ tabla: string }[]>`
    SELECT c.relname AS tabla
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity
       AND NOT EXISTS (
         SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
       )
  `;

  // RLS habilitado sin ninguna politica no filtra: bloquea todo. Es fallar
  // cerrado, asi que no hay fuga — pero la tabla es inutilizable y conviene
  // enterarse en CI y no en el primer request.
  expect(sinPolitica.map((t) => t.tabla)).toEqual([]);
});

it("ningun rol del sistema es superusuario ni tiene BYPASSRLS", async () => {
  /**
   * **Barrido por patron, no lista fija.** La version anterior nombraba
   * `xula_app` y `xula_migrator` a mano, asi que un cuarto rol —creado por
   * comodidad, con BYPASSRLS para "resolver" un permiso— quedaba fuera del
   * test y nadie se enteraba. `xula\_%` los alcanza a todos, incluidos los
   * que todavia no existen.
   *
   * Los tres roles y no solo el de la aplicacion. Que `xula_app` este
   * limpio es lo obvio. Lo que sostiene FORCE ROW LEVEL SECURITY es que
   * `xula_migrator` —el DUENO de las tablas— tampoco sea superusuario: un
   * superusuario ignora RLS siempre, aun con FORCE puesto. Si el owner se
   * volviera superusuario, las politicas seguirian existiendo, los otros
   * tests seguirian en verde, y el aislamiento seria decorativo.
   *
   * Ademas `scripts/bootstrap.sql` no es una migracion y no lo cubre
   * ningun otro test. Este es el unico lugar donde una regresion ahi se
   * detecta.
   */
  const roles = await owner<
    { rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]
  >`
    SELECT rolname, rolsuper, rolbypassrls
      FROM pg_roles
     WHERE rolname LIKE 'xula\\_%'
     ORDER BY rolname
  `;

  // El conjunto exacto: si aparece un rol nuevo, este test obliga a
  // declararlo aca y a mirarle los atributos.
  expect(roles.map((r) => r.rolname)).toEqual([
    "xula_app",
    "xula_migrator",
    "xula_super_admin",
  ]);

  // El assert nombra el rol y el atributo: quien rompa esto no tiene que
  // abrir el test para saber cual fue.
  const privilegiados = roles
    .filter((r) => r.rolsuper || r.rolbypassrls)
    .map(
      (r) => `${r.rolname} (super=${r.rolsuper}, bypassrls=${r.rolbypassrls})`,
    );

  expect(privilegiados).toEqual([]);
});

it("xula_super_admin tiene exactamente los privilegios de tabla que necesita", async () => {
  /**
   * Conjunto exacto y no "contiene": la afirmacion que importa es lo que
   * **no** puede hacer. Un `GRANT SELECT ON usuarios` agregado despues para
   * destrabar algo le daria el padron de personal de todos los municipios,
   * y un assert de inclusion lo dejaria pasar sin decir nada.
   *
   * `role_table_grants` no reporta los GRANT por columna —esos viven en
   * `role_column_grants`— asi que el `SELECT` acotado de `usuarios` no
   * aparece aca. Se verifica aparte.
   */
  const privilegios = await owner<
    { table_name: string; privilege_type: string }[]
  >`
    SELECT table_name, privilege_type
      FROM information_schema.role_table_grants
     WHERE grantee = 'xula_super_admin'
       AND table_schema = 'public'
     ORDER BY table_name, privilege_type
  `;

  expect(privilegios.map((p) => `${p.table_name}.${p.privilege_type}`)).toEqual(
    [
      "ayuntamientos.INSERT",
      "bitacora.INSERT",
      "cuentas.INSERT",
      "cuentas.UPDATE",
      "usuarios.INSERT",
    ],
  );
});

it("su SELECT sobre usuarios es por columna, no sobre la tabla", async () => {
  /**
   * La politica `cuentas_restablece_admin` necesita leer `rol` de
   * `usuarios` en una subconsulta, y eso exige `SELECT`. Darlo sobre la
   * tabla entera abriria `name` y `baja_en` de cada persona de cada
   * municipio; por columna alcanza para la subconsulta y nada mas.
   *
   * `email` entra porque el alta del primer administrador lo necesita para
   * detectar el duplicado antes de escribir.
   */
  const columnas = await owner<{ column_name: string }[]>`
    SELECT column_name
      FROM information_schema.role_column_grants
     WHERE grantee = 'xula_super_admin'
       AND table_schema = 'public'
       AND table_name = 'usuarios'
       AND privilege_type = 'SELECT'
     ORDER BY column_name
  `;

  expect(columnas.map((c) => c.column_name)).toEqual([
    "ayuntamiento_id",
    "email",
    "id",
    "rol",
  ]);
});
