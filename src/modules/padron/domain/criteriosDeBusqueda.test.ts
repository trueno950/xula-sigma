import { describe, expect, it } from "vitest";
import { criteriosDeBusqueda } from "./criteriosDeBusqueda";

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
