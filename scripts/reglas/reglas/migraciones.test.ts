import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe } from "../pruebas";

describe("rls-tabla-nueva", () => {
  const id = "rls-tabla-nueva";

  const tabla = (nombre: string, conAyuntamientoId = true, prefijo = "") =>
    `CREATE TABLE ${prefijo}"${nombre}" (\n\t"id" uuid PRIMARY KEY NOT NULL${
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
   * drizzle-kit 0.31.10 no emite `IF NOT EXISTS` —se verifico contra el
   * paquete instalado—, pero una migracion escrita a mano si puede, y un
   * bump podria cambiarlo. Sin esta forma el `CREATE TABLE` no matchea y la
   * regla sale en verde sin revisar la tabla: el modo de falla mas caro de
   * este repositorio.
   */
  it("reconoce la forma CREATE TABLE IF NOT EXISTS", () => {
    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tabla("lugares", true, "IF NOT EXISTS ")),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("lugares");
  });

  it("no marca IF NOT EXISTS cuando trae las cuatro cosas", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0008_x.sql",
          tabla("lugares", true, "IF NOT EXISTS ") + rls("lugares"),
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * La excepcion documentada en AGENTS.md: un catalogo de plataforma
   * —`abreviaturas` en 0004_padron.sql— no lleva `ayuntamiento_id` porque no
   * pertenece a ningun municipio.
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
