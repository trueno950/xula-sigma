import { normalizarCurp } from "./curp";

export class PersonaInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "PersonaInvalidaError";
  }
}

/** Lo que captura la operadora. `nombreNormalizado` no vive aca: lo escribe
 * el adaptador (decision 6 de proposal.md), nunca el dominio. */
export type DatosDePersona = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  curp: string | null;
};

/**
 * Identidad validada de una persona. `nombres` y `primerApellido` son
 * obligatorios; `segundoApellido` es opcional (pregunta 1 de proposal.md:
 * tres campos separados, no un nombre completo).
 */
export class Persona {
  private constructor(
    readonly nombres: string,
    readonly primerApellido: string,
    readonly segundoApellido: string | null,
    readonly curp: string | null,
  ) {}

  static crear(datos: DatosDePersona): Persona {
    const nombres = datos.nombres.trim();
    const primerApellido = datos.primerApellido.trim();

    if (!nombres) {
      throw new PersonaInvalidaError("nombres es obligatorio.");
    }
    if (!primerApellido) {
      throw new PersonaInvalidaError("primerApellido es obligatorio.");
    }

    const segundoApellido = datos.segundoApellido?.trim() || null;
    const curp = normalizarCurp(datos.curp ?? "");

    return new Persona(nombres, primerApellido, segundoApellido, curp);
  }
}
