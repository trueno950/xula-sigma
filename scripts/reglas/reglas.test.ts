import { describe, expect, it } from "vitest";
import { type Archivo, reglas, revisar } from "./reglas";

/**
 * Cada regla se prueba en los dos sentidos: el codigo que la viola produce
 * hallazgo, y el codigo que la respeta no produce ninguno.
 *
 * El segundo caso es el que importa. Una regla que solo se prueba con su
 * violacion pasa igual si esta rota hacia el falso positivo, y una reja que
 * grita sobre codigo sano se termina desactivando. Los casos "no marca" de
 * cada bloque estan copiados del repositorio real, no inventados.
 */

const archivo = (ruta: string, contenido: string): Archivo => ({
  ruta,
  contenido,
});

const hallazgosDe = (id: string, archivos: Archivo[]) =>
  revisar(archivos).filter((hallazgo) => hallazgo.regla === id);

describe("tenancy-driver", () => {
  const id = "tenancy-driver";

  it("marca el driver de postgres importado fuera de shared/tenancy", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "src/modules/padron/infrastructure/repositorio.ts",
        'import postgres from "postgres";\n',
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.linea).toBe(1);
  });

  it("marca el adaptador drizzle del driver fuera de shared/tenancy", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/territorio/infrastructure/repositorio.ts",
          'import { drizzle } from "drizzle-orm/postgres-js";\n',
        ),
      ]),
    ).toHaveLength(1);
  });

  it("no marca el driver dentro de shared/tenancy", () => {
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
   * `drizzle-orm` a secas es el constructor de consultas: `eq`, `sql`, `and`.
   * Lo importa medio repositorio y no abre ninguna conexion. Confundirlo con
   * el driver haria que la regla marcara cada archivo de infraestructura.
   */
  /**
   * La regla 2 de AGENTS.md dice "**En `src/`**", y el alcance es parte de la
   * regla. `e2e/preparar.ts` siembra los dos municipios del E2E antes de que
   * exista una sesion contra la cual abrir un tenant; sin conexion cruda no
   * hay nada que sembrar.
   */
  it("no marca el andamiaje de E2E, que esta fuera de src/", () => {
    expect(
      hallazgosDe(id, [
        archivo("e2e/preparar.ts", 'import postgres from "postgres";\n'),
      ]),
    ).toEqual([]);
  });

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
    const encontrados = hallazgosDe(id, [
      archivo(
        "src/shared/tenancy/withTenant.ts",
        "await tx`SET app.tenant = 'merida'`;\n",
      ),
    ]);

    expect(encontrados).toHaveLength(1);
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
   * `ON DELETE SET NULL` y `ALTER COLUMN ... SET DEFAULT` son SQL corriente y
   * aparecen en cada migracion. La regla mira parametros con punto
   * -`app.tenant`, `enable_seqscan` no- justamente para no tropezar con ellos.
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

describe("rls-tabla-nueva", () => {
  const id = "rls-tabla-nueva";

  const tabla = (nombre: string, conAyuntamientoId = true) =>
    `CREATE TABLE "${nombre}" (\n\t"id" uuid PRIMARY KEY NOT NULL${
      conAyuntamientoId ? ',\n\t"ayuntamiento_id" uuid NOT NULL' : ""
    }\n);\n`;

  const rls = (nombre: string) =>
    `ALTER TABLE "${nombre}" ENABLE ROW LEVEL SECURITY;\n` +
    `ALTER TABLE "${nombre}" FORCE ROW LEVEL SECURITY;\n` +
    `CREATE POLICY "${nombre}_tenant" ON "${nombre}" AS PERMISSIVE FOR ALL TO "xula_app" USING (true);\n` +
    `GRANT SELECT, INSERT, UPDATE ON "${nombre}" TO "xula_app";\n`;

  it("no marca la tabla que trae las cuatro cosas", () => {
    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tabla("lugares") + rls("lugares")),
      ]),
    ).toEqual([]);
  });

  it("marca la tabla sin FORCE, que es lo que drizzle-kit nunca genera", () => {
    const sinForce = rls("lugares").replace(
      'ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;\n',
      "",
    );
    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tabla("lugares") + sinForce),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("FORCE ROW LEVEL SECURITY");
  });

  it("marca la tabla sin politica", () => {
    const sinPolitica = rls("lugares")
      .split("\n")
      .filter((linea) => !linea.startsWith("CREATE POLICY"))
      .join("\n");

    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tabla("lugares") + sinPolitica),
      ]),
    ).toHaveLength(1);
  });

  it("marca la tabla sin GRANT al rol de aplicacion", () => {
    const sinGrant = rls("lugares")
      .split("\n")
      .filter((linea) => !linea.startsWith("GRANT"))
      .join("\n");

    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tabla("lugares") + sinGrant),
      ]),
    ).toHaveLength(1);
  });

  it("acumula las cuatro ausencias en un solo hallazgo por tabla", () => {
    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tabla("lugares")),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("ENABLE ROW LEVEL SECURITY");
    expect(encontrados[0]?.mensaje).toContain("FORCE ROW LEVEL SECURITY");
    expect(encontrados[0]?.mensaje).toContain("CREATE POLICY");
    expect(encontrados[0]?.mensaje).toContain("GRANT");
  });

  /**
   * La excepcion documentada en AGENTS.md: un catalogo de plataforma
   * -`abreviaturas` en 0004_padron.sql- no lleva `ayuntamiento_id` porque no
   * pertenece a ningun municipio. Sin este caso la regla exigiria RLS sobre
   * una tabla que no tiene contra que filtrar.
   */
  it("no marca un catalogo de plataforma, que no lleva ayuntamiento_id", () => {
    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tabla("abreviaturas", false)),
      ]),
    ).toEqual([]);
  });

  it("revisa cada tabla del archivo por separado", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "drizzle/0008_x.sql",
        tabla("lugares") + rls("lugares") + tabla("calles"),
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("calles");
  });
});

describe("folio-secuencia", () => {
  const id = "folio-secuencia";

  it("marca una secuencia de base de datos", () => {
    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", "CREATE SEQUENCE folio_constancias;\n"),
      ]),
    ).toHaveLength(1);
  });

  it("no marca un contador por tenant", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0008_x.sql",
          'CREATE TABLE "folios" (\n\t"ayuntamiento_id" uuid NOT NULL,\n\t"siguiente" integer NOT NULL\n);\n',
        ),
      ]),
    ).toEqual([]);
  });
});

describe("assets-filesystem", () => {
  const id = "assets-filesystem";

  it("marca escritura al filesystem desde codigo de aplicacion", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/marca/infrastructure/escudo.ts",
          'import { writeFileSync } from "node:fs";\n',
        ),
      ]),
    ).toHaveLength(1);
  });

  /**
   * Los tests leen fixtures del repositorio -`validacion.test.ts` y
   * `identidadPorPuerto.test.ts` lo hacen hoy- y eso no tiene nada que ver
   * con el escudo de un municipio en un contenedor efimero.
   */
  it("no marca un test que lee un fixture", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/marca/validacion.test.ts",
          'import { readFileSync } from "node:fs";\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("no marca los scripts de mantenimiento", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "scripts/seed-dev.ts",
          'import { readFileSync } from "node:fs";\n',
        ),
      ]),
    ).toEqual([]);
  });
});

describe("identificador-ascii", () => {
  const id = "identificador-ascii";

  it("marca una declaracion con acento", () => {
    const encontrados = hallazgosDe(id, [
      archivo("src/modules/padron/domain/x.ts", "const numeroDeSesión = 1;\n"),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("numeroDeSesión");
  });

  it("marca una eñe en el nombre de una funcion", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/padron/domain/x.ts",
          "function agregarCampaña() {}\n",
        ),
      ]),
    ).toHaveLength(1);
  });

  /**
   * El texto en espanol lleva acentos y no es un identificador. Marcarlo
   * convertiria la regla en un ruido constante sobre comentarios y mensajes
   * de usuario, que es justo donde el proyecto SI quiere el espanol correcto.
   */
  it("no marca acentos en comentarios ni en cadenas", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/padron/domain/x.ts",
          '// El numero de sesion se calcula aca.\nconst mensaje = "La sesión expiró";\n',
        ),
      ]),
    ).toEqual([]);
  });
});

describe("modulo-cuatro-capas", () => {
  const id = "modulo-cuatro-capas";

  const conCapas = (modulo: string, capas: string[]) =>
    capas.map((capa) => archivo(`src/modules/${modulo}/${capa}/x.ts`, ""));

  it("no marca el modulo con sus cuatro capas", () => {
    expect(
      hallazgosDe(
        id,
        conCapas("padron", ["domain", "application", "infrastructure", "ui"]),
      ),
    ).toEqual([]);
  });

  it("marca el modulo al que le falta una capa y la nombra", () => {
    const encontrados = hallazgosDe(
      id,
      conCapas("padron", ["domain", "application", "ui"]),
    );

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("infrastructure");
  });
});

describe("cita-con-version", () => {
  const id = "cita-con-version";

  it("marca la cita a un archivo de paquete sin version", () => {
    expect(
      hallazgosDe(id, [
        archivo("src/shared/auth/instancia.ts", "// Ver `sign-up.mjs:166`.\n"),
      ]),
    ).toHaveLength(1);
  });

  it("no marca la cita que lleva la version al lado", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/shared/auth/instancia.ts",
          "// Ver `sign-up.mjs:166` (en 1.6.29).\n",
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * Una cita a un archivo del propio repositorio no necesita version: se mueve
   * con el repositorio y el diff la muestra. La regla del proyecto habla de la
   * linea de un PAQUETE, que cambia sola en el proximo bump.
   */
  it("no marca la cita a un archivo del repositorio", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/territorio/infrastructure/esquema.ts",
          "// (`shared/tenancy/esquema.ts:77`).\n",
        ),
      ]),
    ).toEqual([]);
  });
});

describe("el catalogo de reglas", () => {
  it("no repite identificadores", () => {
    const ids = reglas.map((regla) => regla.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada regla apunta a su antipatron de AGENTS.md", () => {
    for (const regla of reglas) {
      expect(regla.antipatron).toBeGreaterThan(0);
    }
  });

  it("no encuentra nada en un repositorio vacio", () => {
    expect(revisar([])).toEqual([]);
  });
});
