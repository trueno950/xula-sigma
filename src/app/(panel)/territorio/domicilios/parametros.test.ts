import { describe, expect, it } from "vitest";
import { TAMANO_DE_PAGINA } from "@/modules/territorio";
import { leerParametros } from "./parametros";

const raiz = "11111111-1111-4111-8111-111111111111";

describe("leerParametros de /territorio/domicilios", () => {
  it("lee los cuatro filtros", () => {
    const parametros = leerParametros({
      q: "Calle 21",
      numero: "5",
      raiz,
      limite: String(TAMANO_DE_PAGINA * 2),
    });

    expect(parametros.filtros).toEqual({
      raizId: raiz,
      calle: "Calle 21",
      numero: "5",
    });
    expect(parametros.limite).toBe(TAMANO_DE_PAGINA * 2);
  });

  it("sin parametros, el registro sin filtros y con el limite por defecto", () => {
    expect(leerParametros({})).toEqual({ filtros: {}, limite: undefined });
  });

  /**
   * El bug que documenta `reportes/parametros.ts`: un campo malformado cae
   * solo. Con un `.safeParse()` del objeto entero, un `limite` basura
   * tiraba tambien la calle escrita y la operadora perdia el filtro sin
   * que nada lo avisara.
   */
  it("un limite malformado cae solo y no se lleva los otros filtros", () => {
    const parametros = leerParametros({
      q: "Calle 21",
      numero: "5",
      raiz,
      limite: "muchas",
    });

    expect(parametros.limite).toBeUndefined();
    expect(parametros.filtros).toEqual({
      raizId: raiz,
      calle: "Calle 21",
      numero: "5",
    });
  });

  it("una raiz malformada cae sola y no se lleva la calle ni el numero", () => {
    const parametros = leerParametros({
      q: "Calle 21",
      numero: "5",
      raiz: "no-es-un-uuid",
    });

    expect(parametros.filtros).toEqual({ calle: "Calle 21", numero: "5" });
  });

  it("un filtro repetido en la URL cae por su cuenta", () => {
    const parametros = leerParametros({
      q: ["Calle 21", "Calle 22"],
      numero: "5",
    });

    expect(parametros.filtros).toEqual({ numero: "5" });
  });

  it("un limite fuera del tope cae solo", () => {
    const parametros = leerParametros({
      q: "Calle 21",
      limite: String(TAMANO_DE_PAGINA * 40 + 1),
    });

    expect(parametros.limite).toBeUndefined();
    expect(parametros.filtros).toEqual({ calle: "Calle 21" });
  });

  it("un filtro en blanco no viaja como cadena vacia", () => {
    expect(leerParametros({ q: "   ", numero: "" }).filtros).toEqual({});
  });
});
