/**
 * El conteo de una lista, en espaniol y sin depender de una libreria: una
 * sola funcion para «1 cuenta» y «3 cuentas» (S4 de `usuarios-ux`, donde un
 * cero tambien es un dato y no desaparece).
 *
 * El singular y el plural llegan escritos y no se derivan: «activa» y
 * «activas» no se arman con una regla que valga para todas las palabras.
 */
export const pluralizar = (
  cantidad: number,
  singular: string,
  varios: string,
): string => `${cantidad} ${cantidad === 1 ? singular : varios}`;
