import { describe, expect, it } from "vitest";
import {
  avisoDePalabrasIgnoradas,
  criteriosDeBusqueda,
  palabrasIgnoradasDeBusqueda,
} from "./criteriosDeBusqueda";
import { normalizarParaBusqueda } from "./normalizarParaBusqueda";

describe("criteriosDeBusqueda", () => {
  it("cada palabra de la cadena expandida es un prefijo a buscar", () => {
    expect(criteriosDeBusqueda("gpe poot", "guadalupe poot").palabras).toEqual([
      "guadalupe",
      "poot",
    ]);
  });

  it("una cadena vacia no aporta palabras ni CURP", () => {
    expect(criteriosDeBusqueda("   ", "")).toEqual({ palabras: [] });
  });

  it("una CURP completa se propone en mayusculas aunque se escriba en minusculas", () => {
    expect(criteriosDeBusqueda("pocm800101myn", "pocm800101myn").curp).toBe(
      "POCM800101MYN",
    );
  });

  it("una CURP con espacios de por medio se junta antes de proponerse", () => {
    expect(criteriosDeBusqueda("POCM 800101", "pocm 800101").curp).toBe(
      "POCM800101",
    );
  });

  it("una CURP completa de 18 caracteres se propone tal cual", () => {
    expect(
      criteriosDeBusqueda("POCM800101MYNXXX09", "pocm800101mynxxx09").curp,
    ).toBe("POCM800101MYNXXX09");
  });

  it.each(["Poot", "Guadalupe", "Maria Guadalupe", "POCM"])(
    "%s no tiene forma de fragmento de CURP",
    (cadena) => {
      expect(criteriosDeBusqueda(cadena, cadena.toLowerCase()).curp).toBe(
        undefined,
      );
    },
  );

  it("mas de 18 caracteres alfanumericos no es una CURP", () => {
    expect(
      criteriosDeBusqueda("POCM800101MYNXXX091", "pocm800101mynxxx091").curp,
    ).toBe(undefined);
  });

  it("no propone un fragmento con comodines de LIKE como CURP", () => {
    expect(criteriosDeBusqueda("POCM8%01", "pocm8%01").curp).toBe(undefined);
  });

  it("corta en 8 palabras una cadena con mas, porque cada una se vuelve predicados", () => {
    const veinte = Array.from({ length: 20 }, (_, i) => `palabra${i}`).join(
      " ",
    );

    expect(criteriosDeBusqueda(veinte, veinte).palabras).toHaveLength(8);
  });
});

describe("palabrasIgnoradasDeBusqueda", () => {
  const diez = Array.from({ length: 10 }, (_, i) => `palabra${i}`).join(" ");

  it("cuenta las palabras que el tope deja fuera de la busqueda", () => {
    expect(palabrasIgnoradasDeBusqueda(diez)).toBe(2);
  });

  it("una sola palabra de mas cuenta como una", () => {
    expect(palabrasIgnoradasDeBusqueda("a b c d e f g h i")).toBe(1);
  });

  it("hasta el tope no se ignora ninguna", () => {
    expect(palabrasIgnoradasDeBusqueda("a b c d e f g h")).toBe(0);
    expect(palabrasIgnoradasDeBusqueda("   ")).toBe(0);
  });

  /**
   * La cuenta se hace sobre la cadena escrita y la busqueda sobre la
   * expandida: coinciden mientras cada abreviatura del catalogo sea una
   * sola palabra, que es como esta sembrado
   * (`drizzle/0004_padron.sql`).
   */
  it("cuenta lo mismo que recorta la busqueda, con abreviaturas de por medio", () => {
    const cadena = "gpe poot canul pech ma jose maria lopez santos uno";
    const expandida = normalizarParaBusqueda(
      cadena,
      new Map([
        ["gpe", "guadalupe"],
        ["ma", "maria"],
      ]),
    );
    const buscadas = criteriosDeBusqueda(cadena, expandida).palabras.length;

    expect(buscadas + palabrasIgnoradasDeBusqueda(cadena)).toBe(10);
  });
});

describe("avisoDePalabrasIgnoradas", () => {
  it("avisa en plural cuantas palabras quedaron fuera", () => {
    const diez = Array.from({ length: 10 }, (_, i) => `palabra${i}`).join(" ");

    expect(avisoDePalabrasIgnoradas(diez)).toBe(
      "Se busca con las 8 primeras palabras; se ignoraron 2 palabras.",
    );
  });

  it("avisa en singular cuando quedo fuera una sola", () => {
    expect(avisoDePalabrasIgnoradas("a b c d e f g h i")).toBe(
      "Se busca con las 8 primeras palabras; se ignoró 1 palabra.",
    );
  });

  it("sin palabras ignoradas no hay nada que avisar", () => {
    expect(avisoDePalabrasIgnoradas("gpe poot")).toBe(undefined);
  });
});
