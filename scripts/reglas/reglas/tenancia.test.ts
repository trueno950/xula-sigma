import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe } from "../pruebas";

/**
 * Cada regla se prueba en los dos sentidos: el codigo que la viola produce
 * hallazgo, y el codigo que la respeta no produce ninguno.
 *
 * El segundo caso es el que importa. Una regla que solo se prueba con su
 * violacion pasa igual si esta rota hacia el falso positivo, y una reja que
 * grita sobre codigo sano se termina desactivando.
 */

describe("tenancy-driver", () => {
  const id = "tenancy-driver";

  it("marca el driver de postgres en un modulo", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "src/modules/padron/infrastructure/repositorio.ts",
        'import postgres from "postgres";\n',
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.linea).toBe(1);
  });

  it("marca el adaptador drizzle del driver", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/territorio/infrastructure/repositorio.ts",
          'import { drizzle } from "drizzle-orm/postgres-js";\n',
        ),
      ]),
    ).toHaveLength(1);
  });

  it("no marca una salida sancionada", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/tenancy/withTenant.ts",
          'import postgres from "postgres";\n',
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * El caso que motivo la lista, y que el directorio entero como permiso
   * dejaba pasar: la regla 2 dice que hay tres excepciones y que no se usa
   * una cuarta sin actualizar la regla. Un archivo nuevo adentro de
   * `shared/tenancy` es exactamente esa cuarta.
   */
  it("marca una salida NUEVA dentro de shared/tenancy", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "src/shared/tenancy/atajoNuevo.ts",
        'import postgres from "postgres";\n',
      ),
    ]);

    expect(encontrados).toHaveLength(1);
  });

  /**
   * La regla 2 de AGENTS.md dice "**En `src/`**", y el alcance es parte de
   * la regla. `e2e/preparar.ts` siembra los dos municipios del E2E antes de
   * que exista una sesion contra la cual abrir un tenant.
   */
  it("no marca el andamiaje de E2E, que esta fuera de src/", () => {
    expect(
      hallazgosDe(id, [
        archivo("e2e/preparar.ts", 'import postgres from "postgres";\n'),
      ]),
    ).toEqual([]);
  });

  /**
   * `drizzle-orm` a secas es el constructor de consultas: `eq`, `sql`,
   * `and`. Lo importa medio repositorio y no abre ninguna conexion.
   */
  it("no marca el constructor de consultas de drizzle-orm", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/padron/infrastructure/repositorio.ts",
          'import { and, eq } from "drizzle-orm";\n',
        ),
      ]),
    ).toEqual([]);
  });
});

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
