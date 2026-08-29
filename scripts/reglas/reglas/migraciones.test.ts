import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe, rlsSql, tablaSql } from "../pruebas";

describe("rls-tabla-nueva", () => {
  const id = "rls-tabla-nueva";

  it("no marca la tabla que trae las cuatro cosas", () => {
    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tablaSql("lugares") + rlsSql("lugares")),
      ]),
    ).toEqual([]);
  });

  it("marca la tabla sin FORCE, que es lo que drizzle-kit nunca genera", () => {
    const sinForce = rlsSql("lugares").replace(
      'ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;\n',
      "",
    );
    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("lugares") + sinForce),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("FORCE ROW LEVEL SECURITY");
  });

  it("marca la tabla sin politica", () => {
    const sinPolitica = rlsSql("lugares")
      .split("\n")
      .filter((linea) => !linea.startsWith("CREATE POLICY"))
      .join("\n");

    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tablaSql("lugares") + sinPolitica),
      ]),
    ).toHaveLength(1);
  });

  it("marca la tabla sin GRANT al rol de aplicacion", () => {
    const sinGrant = rlsSql("lugares")
      .split("\n")
      .filter((linea) => !linea.startsWith("GRANT"))
      .join("\n");

    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tablaSql("lugares") + sinGrant),
      ]),
    ).toHaveLength(1);
  });

  it("acumula las cuatro ausencias en un solo hallazgo por tabla", () => {
    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("lugares")),
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
      archivo(
        "drizzle/0008_x.sql",
        tablaSql("lugares", true, "IF NOT EXISTS "),
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("lugares");
  });

  it("no marca IF NOT EXISTS cuando trae las cuatro cosas", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0008_x.sql",
          tablaSql("lugares", true, "IF NOT EXISTS ") + rlsSql("lugares"),
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * El caso que el fixture anterior daba por bueno. Una politica sobre una
   * tabla con `ayuntamiento_id` que no menciona el tenant no filtra nada: la
   * tabla queda con RLS activo y una regla que deja pasar todo. Es peor que
   * no tener politica, porque las otras tres piezas estan y parece completo.
   */
  it("marca una politica que no filtra por el tenant", () => {
    const sinFiltro =
      `ALTER TABLE "lugares" ENABLE ROW LEVEL SECURITY;\n` +
      `ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;\n` +
      `CREATE POLICY "lugares_todo" ON "lugares" AS PERMISSIVE FOR ALL TO "xula_app" USING (true);\n` +
      `GRANT SELECT ON "lugares" TO "xula_app";\n`;

    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("lugares") + sinFiltro),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("filtre por el tenant");
  });

  /**
   * Un GRANT al super admin no habilita a la aplicacion. Sin el rol de
   * aplicacion, la tabla existe pero ningun request la puede leer — y la
   * version anterior de la regla daba verde porque solo miraba que hubiera
   * un GRANT que nombrara la tabla.
   */
  it("marca un GRANT que no alcanza al rol de aplicacion", () => {
    const otroRol =
      `ALTER TABLE "lugares" ENABLE ROW LEVEL SECURITY;\n` +
      `ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;\n` +
      `CREATE POLICY "lugares_tenant" ON "lugares" FOR ALL TO "xula_app" USING (ayuntamiento_id = current_setting('app.tenant')::uuid);\n` +
      `GRANT SELECT ON "lugares" TO "xula_super_admin";\n`;

    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("lugares") + otroRol),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("xula_app");
  });

  /**
   * Una tabla puede llevar ademas la politica del super admin, con otro
   * predicado y a proposito. Alcanza con que UNA filtre por tenant.
   */
  it("no marca cuando una politica filtra y otra no", () => {
    const dos =
      rlsSql("lugares") +
      `CREATE POLICY "lugares_super" ON "lugares" FOR SELECT TO "xula_super_admin" USING (true);\n`;

    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tablaSql("lugares") + dos),
      ]),
    ).toEqual([]);
  });

  it("no marca un catalogo de plataforma, que no lleva ayuntamiento_id", () => {
    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", tablaSql("abreviaturas", false)),
      ]),
    ).toEqual([]);
  });

  it("revisa cada tabla del archivo por separado", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "drizzle/0008_x.sql",
        tablaSql("lugares") + rlsSql("lugares") + tablaSql("calles"),
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("calles");
  });
});
