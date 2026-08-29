import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe, rlsSql, tablaSql } from "../pruebas";

/**
 * La otra mitad de `rls-tabla-nueva`: no si la tabla trae las cuatro piezas,
 * sino si la tabla debia traerlas.
 *
 * La version anterior filtraba las tablas por `/"ayuntamiento_id"/` antes de
 * revisarlas, o sea que una tabla de municipio a la que le faltara la columna
 * salia por el mismo lado que un catalogo de plataforma legitimo: sin
 * revisar y en verde. El item 1 del check-list de migraciones de AGENTS.md
 * —"Columna `ayuntamiento_id`"— no lo verificaba nadie.
 */
describe("rls-tabla-nueva: la columna y las exenciones", () => {
  const id = "rls-tabla-nueva";

  it("marca una tabla nueva sin ayuntamiento_id", () => {
    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("constancias", false)),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("ayuntamiento_id");
  });

  /**
   * Y no la salva traer el resto. Este es el caso que la version anterior
   * dejaba pasar: sin la columna, la tabla ni siquiera entraba al filtro.
   */
  it("marca la tabla sin ayuntamiento_id aunque traiga RLS y GRANT", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0008_x.sql",
          tablaSql("constancias", false) + rlsSql("constancias"),
        ),
      ]),
    ).toHaveLength(1);
  });

  /**
   * `abreviaturas` es la excepcion escrita en AGENTS.md: un diccionario de
   * plataforma que no guarda dato de ningun municipio.
   */
  it("no marca el catalogo de plataforma de la lista", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0004_padron.sql",
          tablaSql("abreviaturas", false) +
            `GRANT SELECT ON "abreviaturas" TO "xula_app";\n`,
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * Lo que protege a un catalogo exento no es una politica sino el `GRANT`:
   * `SELECT` y nunca escritura. Lo dice AGENTS.md en la misma seccion que
   * concede la excepcion, y sin esta pieza la exencion seria el agujero que
   * esa seccion existe para cerrar.
   */
  it("marca el catalogo exento con permiso de escritura", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "drizzle/0004_padron.sql",
        tablaSql("abreviaturas", false) +
          `GRANT SELECT, INSERT ON "abreviaturas" TO "xula_app";\n`,
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("escritura");
  });

  /**
   * `ayuntamientos` no es un catalogo: es la raiz del tenant. No lleva
   * `ayuntamiento_id` porque su propio `id` ES el tenant, y su politica
   * filtra por esa columna. No esta en la lista de catalogos de AGENTS.md
   * porque no es uno, y por eso hace falta nombrarla aparte.
   */
  it("no marca la tabla raiz del tenant", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0000_fundacion_multitenant.sql",
          tablaSql("ayuntamientos", false),
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * Nombrar la columna no es filtrar por ella. `USING (ayuntamiento_id IS NOT
   * NULL)` menciona el token y deja ver las filas de todos los municipios.
   * La reja pregunta por la comparacion contra `app.tenant`, que es la unica
   * forma en que este repositorio escribe el predicado.
   */
  it("marca la politica que nombra la columna sin comparar con el tenant", () => {
    const sinComparacion = rlsSql("lugares").replace(
      "ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid",
      "ayuntamiento_id IS NOT NULL",
    );

    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("lugares") + sinComparacion),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("filtre por el tenant");
  });

  /**
   * Las migraciones de este repositorio vienen comentadas, y el comentario
   * que explica una pieza usa las mismas palabras que la pieza.
   * `0004_padron.sql:50` dice "Sin INSERT ni UPDATE a proposito" arriba de un
   * `GRANT SELECT`, y la primera version de la exencion lo leyo como permiso
   * de escritura. El caso simetrico es peor: un `FORCE` mencionado en un
   * comentario dando por satisfecha una pieza que no esta.
   */
  it("no lee un comentario como si fuera un permiso de escritura", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0004_padron.sql",
          `${tablaSql("abreviaturas", false)}-- Sin INSERT ni UPDATE a proposito: se cura a mano.\n` +
            `GRANT SELECT ON "abreviaturas" TO "xula_app";\n`,
        ),
      ]),
    ).toEqual([]);
  });

  it("no da por puesta una pieza que solo aparece en un comentario", () => {
    const comentada = rlsSql("lugares").replace(
      'ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;',
      '-- ALTER TABLE "lugares" FORCE ROW LEVEL SECURITY;',
    );

    const encontrados = hallazgosDe(id, [
      archivo("drizzle/0008_x.sql", tablaSql("lugares") + comentada),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("FORCE ROW LEVEL SECURITY");
  });
});
