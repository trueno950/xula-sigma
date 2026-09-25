import { describe, expect, it } from "vitest";
import { violaRestriccionUnica } from "./violacionDeRestriccion";

const errorDePostgres = (restriccion: string, code = "23505") =>
  Object.assign(new Error("duplicate key"), {
    code,
    constraint_name: restriccion,
  });

describe("violaRestriccionUnica", () => {
  it("reconoce la restriccion pedida cuando el error de Postgres llega directo", () => {
    expect(
      violaRestriccionUnica(
        errorDePostgres("lugares_una_cabecera"),
        "lugares_una_cabecera",
      ),
    ).toBe(true);
  });

  it("la encuentra dentro de .cause, donde la deja el envoltorio de drizzle", () => {
    const envuelto = new Error("Failed query", {
      cause: errorDePostgres("lugares_una_cabecera"),
    });

    expect(violaRestriccionUnica(envuelto, "lugares_una_cabecera")).toBe(true);
  });

  it("no confunde otra restriccion unica con la pedida", () => {
    expect(
      violaRestriccionUnica(
        errorDePostgres("calles_tenant_lugar_nombre_idx"),
        "lugares_una_cabecera",
      ),
    ).toBe(false);
  });

  it("no confunde otro codigo de error de Postgres con una unicidad", () => {
    expect(
      violaRestriccionUnica(
        errorDePostgres("lugares_una_cabecera", "23503"),
        "lugares_una_cabecera",
      ),
    ).toBe(false);
  });

  it.each([null, undefined, "texto", 42])(
    "un valor que no es error (%s) no viola nada",
    (valor) => {
      expect(violaRestriccionUnica(valor, "lugares_una_cabecera")).toBe(false);
    },
  );
});
