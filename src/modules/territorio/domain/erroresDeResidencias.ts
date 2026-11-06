/**
 * Errores de residencias, separados de `errores.ts` por el mismo motivo que
 * `erroresDeZonas.ts`: ese archivo esta en su metrica de 200 lineas.
 *
 * `MudanzaConcurrenteError` traduce el choque con
 * `residencias_una_abierta_idx`: dos mudanzas de la misma persona que se
 * cruzan en el tiempo ven las dos "sin residencia abierta" -o cierran la
 * misma-, y la segunda en confirmar choca con la que abrio la primera. Ningun
 * bloqueo de filas lo evita: en la primera mudanza no hay fila que bloquear.
 * El indice es el mecanismo de concurrencia; este error solo le pone un
 * mensaje para la operadora.
 */
export class MudanzaConcurrenteError extends Error {
  readonly codigo = "MUDANZA_CONCURRENTE";

  constructor(
    mensaje = "Ya se registró otra mudanza para esta persona al mismo tiempo. Revise el historial.",
  ) {
    super(mensaje);
    this.name = "MudanzaConcurrenteError";
  }
}
