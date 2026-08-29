import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe } from "../pruebas";

/**
 * El antipatron 3 en las dos formas que puede tomar. La segunda es la unica
 * que este repositorio escribe, y es la que la primera version de la regla
 * no veia.
 */

describe("set-local", () => {
  const id = "set-local";

  it("marca un SET de parametro de sesion sin LOCAL", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/tenancy/withTenant.ts",
          "await tx`SET app.tenant = 'merida'`;\n",
        ),
      ]),
    ).toHaveLength(1);
  });

  it("no marca cuando lleva LOCAL", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/tenancy/withTenant.ts",
          "await tx`SET LOCAL app.tenant = 'merida'`;\n",
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * El vector real de este repositorio, y el que la primera version de la
   * regla no veia. `withTenant.ts:117` explica que `SET LOCAL app.tenant =
   * $1` no existe porque la sintaxis SET no acepta parametros: el tenant se
   * fija con `set_config`, y su tercer argumento es el que decide si muere
   * en el COMMIT. `false` esta a un caracter de `true`.
   */
  it("marca set_config con el tercer argumento en false", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "src/shared/tenancy/withTenant.ts",
        "await tx`SELECT set_config('app.tenant', 'merida', false)`;\n",
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("app.tenant");
  });

  it("no marca set_config con el tercer argumento en true", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/tenancy/withTenant.ts",
          "await tx`SELECT set_config('app.tenant', 'merida', true)`;\n",
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * `is_local` es un `boolean`, y `false` es solo una de sus escrituras.
   * Verificado contra Postgres 17: `set_config('app.a','1',0::boolean)`,
   * `set_config('app.b','2','FALSE')` y `set_config('app.c','3','f')`
   * devuelven el valor sin error y dejan la variable a nivel de sesion,
   * igual que `false`. Una reja que solo busca el literal `false` las deja
   * pasar a las tres.
   *
   * Por eso la pregunta se invierte: no "es esto una fuga" sino "prueba
   * este argumento que muere en el COMMIT". Lo que no lo prueba, se marca.
   * Es la unica direccion honesta para el invariante mas caro del proyecto.
   */
  for (const tercero of ["0::boolean", "'FALSE'", "'f'", "esLocal"]) {
    it(`marca set_config con el tercer argumento en ${tercero}`, () => {
      expect(
        hallazgosDe(id, [
          archivo(
            "src/shared/tenancy/withTenant.ts",
            `await tx\`SELECT set_config('app.tenant', 'merida', ${tercero})\`;\n`,
          ),
        ]),
      ).toHaveLength(1);
    });
  }

  /**
   * La otra cara: `'t'` y `'true'` si prueban que es local, y Postgres las
   * acepta. Marcarlas seria ruido, y una reja ruidosa se termina apagando.
   */
  for (const tercero of ["'true'", "'t'", "TRUE"]) {
    it(`no marca set_config con el tercer argumento en ${tercero}`, () => {
      expect(
        hallazgosDe(id, [
          archivo(
            "src/shared/tenancy/withTenant.ts",
            `await tx\`SELECT set_config('app.tenant', 'merida', ${tercero})\`;\n`,
          ),
        ]),
      ).toEqual([]);
    });
  }

  /**
   * La forma real de `scripts/plataforma-admin.sql:31`: el valor es una
   * subconsulta con sus propios parentesis. La version anterior de la regla
   * usaba `[^)]*` y el match se frenaba ahi, sin llegar nunca al tercer
   * argumento — o sea que la fuga se colaba justo en la forma que el
   * repositorio escribe de verdad.
   */
  it("marca set_config en false aunque el valor sea una subconsulta", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "scripts/plataforma-admin.sql",
        "SELECT set_config(\n  'app.tenant',\n" +
          "  (SELECT id::text FROM ayuntamientos WHERE es_plataforma),\n" +
          "  false\n);\n",
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("app.tenant");
  });

  it("no marca la misma subconsulta cuando cierra en true", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "scripts/plataforma-admin.sql",
          "SELECT set_config(\n  'app.tenant',\n" +
            "  (SELECT id::text FROM ayuntamientos WHERE es_plataforma),\n" +
            "  true\n);\n",
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * Un comentario que DESCRIBE la fuga no es la fuga. Sin esta distincion el
   * propio archivo de la regla se marcaba a si mismo, y el unico arreglo
   * habria sido dejar de explicar por que la regla existe.
   */
  it("no marca un comentario que explica el antipatron", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/tenancy/withTenant.ts",
          "// Nunca set_config('app.tenant', x, false): sobrevive al COMMIT.\n" +
            "-- Tampoco SET app.tenant = 'x' suelto.\n",
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * `ON DELETE SET NULL` y `ALTER COLUMN ... SET DEFAULT` son SQL corriente
   * y aparecen en cada migracion. La regla mira parametros con punto
   * justamente para no tropezar con ellos.
   */
  it("no marca el SET de una definicion de tabla", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0008_algo.sql",
          'ALTER TABLE "calles" ALTER COLUMN "nombre" SET DEFAULT \'\';\n' +
            'ALTER TABLE "calles" ADD CONSTRAINT "fk" FOREIGN KEY ("x") REFERENCES "y"("id") ON DELETE SET NULL;\n',
        ),
      ]),
    ).toEqual([]);
  });
});
