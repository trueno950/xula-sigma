import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe } from "../pruebas";

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
   * Los tests leen fixtures del repositorio —`validacion.test.ts` y
   * `identidadPorPuerto.test.ts` lo hacen hoy— y eso no tiene nada que ver
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

  /**
   * Mismo andamiaje que `tenancia.ts` reconoce para la regla 2 -un
   * `*DePrueba.ts` abre su propia conexion y lee fixtures del repositorio,
   * no guarda el escudo de un municipio- pero antipatron 12 solo excluia
   * `*.test.ts` y dejaba este archivo marcado.
   */
  it("no marca un DePrueba.ts que lee un fixture", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/modules/territorio/migracionDeZonasRollbackDePrueba.ts",
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

  it("marca una enie en el nombre de una funcion", () => {
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
   * convertiria la regla en ruido constante sobre comentarios y mensajes de
   * usuario, que es justo donde el proyecto SI quiere el espanol correcto.
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
   * Una cita a un archivo del propio repositorio no necesita version: se
   * mueve con el repositorio y el diff la muestra. La regla del proyecto
   * habla de la linea de un PAQUETE, que cambia sola en el proximo bump.
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
