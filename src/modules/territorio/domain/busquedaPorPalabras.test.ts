import { describe, expect, it } from "vitest";
import {
  avisoDePalabrasIgnoradas,
  palabrasIgnoradasDeBusqueda,
} from "./busquedaPorPalabras";

const OCHO = "a b c d e f g h";

describe("palabrasIgnoradasDeBusqueda", () => {
  it("cuenta las palabras que el tope deja fuera de la busqueda", () => {
    expect(palabrasIgnoradasDeBusqueda(OCHO)).toBe(2);
  });

  it("una sola palabra de mas cuenta como una", () => {
    expect(palabrasIgnoradasDeBusqueda("a b c d e f g")).toBe(1);
  });

  it("hasta el tope no se ignora ninguna", () => {
    expect(palabrasIgnoradasDeBusqueda("a b c d e f")).toBe(0);
    expect(palabrasIgnoradasDeBusqueda("  Calle 22   265 ")).toBe(0);
    expect(palabrasIgnoradasDeBusqueda("")).toBe(0);
  });

  it("los signos que la particion ya descarta no cuentan como palabra ignorada", () => {
    expect(palabrasIgnoradasDeBusqueda("a b c d e f g # , -")).toBe(1);
  });
});

describe("avisoDePalabrasIgnoradas", () => {
  it("avisa en plural cuantas palabras quedaron fuera", () => {
    expect(avisoDePalabrasIgnoradas(OCHO)).toBe(
      "Se busca con las 6 primeras palabras; se ignoraron 2 palabras.",
    );
  });

  it("avisa en singular cuando quedo fuera una sola", () => {
    expect(avisoDePalabrasIgnoradas("a b c d e f g")).toBe(
      "Se busca con las 6 primeras palabras; se ignoró 1 palabra.",
    );
  });

  it("sin palabras ignoradas no hay nada que avisar", () => {
    expect(avisoDePalabrasIgnoradas("Calle 22 265")).toBe(undefined);
  });
});
