export class CurpInvalidaError extends Error {
  constructor(mensaje = "La CURP no tiene un formato válido.") {
    super(mensaje);
    this.name = "CurpInvalidaError";
  }
}

/**
 * Forma general de una CURP: 4 letras, fecha de nacimiento, sexo, entidad,
 * 3 consonantes internas, un caracter alfanumerico y un digito.
 *
 * Sin verificar el digito de control contra RENAPO — proposal.md lo deja
 * fuera de esta fase a proposito. Esto solo rechaza lo que no tiene la
 * forma de una CURP.
 */
const FORMATO_CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;

/**
 * '' -> null (decision 10 de proposal.md): un NULL no colisiona con otro
 * NULL en `uniqueIndex(ayuntamientoId, curp)`, asi que "opcional pero
 * unica cuando existe" es directamente expresable. Guardar '' haria
 * colisionar dos personas sin CURP.
 */
export function normalizarCurp(entrada: string): string | null {
  const curp = entrada.trim().toUpperCase();

  if (curp === "") return null;
  if (!FORMATO_CURP.test(curp)) throw new CurpInvalidaError();

  return curp;
}
