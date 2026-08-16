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

it("ni el rol de aplicacion ni el owner son superusuario ni tienen BYPASSRLS", async () => {
  /**
   * Los DOS roles, no solo el de la aplicacion.
   *
   * Que `xula_app` este limpio es lo obvio. Lo que sostiene FORCE ROW
   * LEVEL SECURITY es que `xula_migrator` —el DUENO de las tablas—
   * tampoco sea superusuario: un superusuario ignora RLS siempre, aun con
   * FORCE puesto. Si el owner se volviera superusuario, las politicas
   * seguirian existiendo, los otros tests seguirian en verde, y el
   * aislamiento seria decorativo para esa conexion.
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
     WHERE rolname IN ('xula_app', 'xula_migrator')
     ORDER BY rolname
  `;

  expect(roles.map((r) => r.rolname)).toEqual(["xula_app", "xula_migrator"]);

  // El assert nombra el rol y el atributo: quien rompa esto no tiene que
  // abrir el test para saber cual de los dos fue.
  const privilegiados = roles
    .filter((r) => r.rolsuper || r.rolbypassrls)
    .map(
      (r) => `${r.rolname} (super=${r.rolsuper}, bypassrls=${r.rolbypassrls})`,
    );

  expect(privilegiados).toEqual([]);
});
