import { describe, expect, it } from "vitest";
import { CurpInvalidaError } from "./curp";
import { Persona, PersonaInvalidaError } from "./persona";

describe("Persona.crear", () => {
  it("acepta nombres y primerApellido, con segundoApellido opcional", () => {
    const persona = Persona.crear({
      nombres: "Maria Guadalupe",
      primerApellido: "Kumul",
      segundoApellido: "Pech",
      curp: null,
    });

    expect(persona.nombres).toBe("Maria Guadalupe");
    expect(persona.primerApellido).toBe("Kumul");
    expect(persona.segundoApellido).toBe("Pech");
  });

  it("segundoApellido ausente queda en null", () => {
    const persona = Persona.crear({
      nombres: "Juan",
      primerApellido: "Poot",
      segundoApellido: null,
      curp: null,
    });

    expect(persona.segundoApellido).toBeNull();
  });

  it("rechaza nombres vacio", () => {
    expect(() =>
      Persona.crear({
        nombres: "  ",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: null,
      }),
    ).toThrow(PersonaInvalidaError);
  });

  it("rechaza primerApellido vacio", () => {
    expect(() =>
      Persona.crear({
        nombres: "Juan",
        primerApellido: "",
        segundoApellido: null,
        curp: null,
      }),
    ).toThrow(PersonaInvalidaError);
  });

  it("cadena vacia de CURP normaliza a null", () => {
    const persona = Persona.crear({
      nombres: "Juan",
      primerApellido: "Poot",
      segundoApellido: null,
      curp: "",
    });

    expect(persona.curp).toBeNull();
  });

  it("propaga el rechazo de una CURP con formato invalido", () => {
    expect(() =>
      Persona.crear({
        nombres: "Juan",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: "no-es-una-curp",
      }),
    ).toThrow(CurpInvalidaError);
  });
});
