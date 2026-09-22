import { describe, expect, it } from "vitest";
import { leerParametrosDeMapa } from "./parametros";

describe("leerParametrosDeMapa", () => {
  it("un tipo del vocabulario de reportes se conserva", () => {
    const parametros = leerParametrosDeMapa({ tipo: "BASURA" });

    expect(parametros.tipo).toBe("BASURA");
  });

  it("un tipo del vocabulario de intervenciones se conserva", () => {
    const parametros = leerParametrosDeMapa({ tipo: "OBRA" });

    expect(parametros.tipo).toBe("OBRA");
  });

  it("un tipo fuera de ambos vocabularios cae a undefined sin romper estado", () => {
    const parametros = leerParametrosDeMapa({
      tipo: "INVENTADO",
      estado: "RECIBIDO",
    });

    expect(parametros.tipo).toBeUndefined();
    expect(parametros.estado).toBe("RECIBIDO");
  });

  it("tipo=a&tipo=b (string[]) cae a undefined sin romper area", () => {
    const parametros = leerParametrosDeMapa({
      tipo: ["BACHE", "OBRA"],
      area: "OBRAS_PUBLICAS",
    });

    expect(parametros.tipo).toBeUndefined();
    expect(parametros.area).toBe("OBRAS_PUBLICAS");
  });

  it("un area fuera de la union cerrada cae a undefined", () => {
    const parametros = leerParametrosDeMapa({ area: "INVENTADA" });

    expect(parametros.area).toBeUndefined();
  });

  it("sin parametros, todo cae a undefined", () => {
    const parametros = leerParametrosDeMapa({});

    expect(parametros).toEqual({
      tipo: undefined,
      estado: undefined,
      area: undefined,
    });
  });
});
