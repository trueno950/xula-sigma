/**
 * La clave del objeto en el almacen: prefijo del tenant + nombre opaco.
 *
 * El `ayuntamientoId` es el unico prefijo: ata el objeto al tenant para
 * quien mire el bucket. El uuid entra por parametro y no se genera aca —
 * `crypto.randomUUID()` es infraestructura, y esta funcion queda pura.
 */
export const claveDeEscudo = (ayuntamientoId: string, uuid: string): string =>
  `${ayuntamientoId}/escudo-${uuid}.png`;
