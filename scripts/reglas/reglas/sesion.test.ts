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
