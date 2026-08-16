/**
 * `AyuntamientoId` es un `string` con marca de tipo.
 *
 * El `ayuntamiento_id` es el dato del que depende todo el aislamiento: es
 * lo que entra en la politica RLS. Dejarlo circular como `string` suelto
 * significa que cualquier cadena —un id de persona, un folio, algo que
 * llego del cliente— entra sin que el compilador diga nada.
 *
 * Con la marca, el unico camino para obtener uno es `comoAyuntamientoId`,
 * que valida. Es una garantia en compilacion; el chequeo en tiempo de
 * ejecucion sigue existiendo dentro de `withTenant` porque la marca se
 * puede evadir con un cast, y la defensa no puede depender de que nadie
 * escriba `as`.
 */

declare const marca: unique symbol;

export type AyuntamientoId = string & { readonly [marca]: "AyuntamientoId" };

/**
 * UUID version 1 a 8, variante RFC 4122. Los ids los genera Postgres con
 * `gen_random_uuid()` (v4), pero se acepta el rango completo para no atar
 * la validacion a una version concreta.
 */
export const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esAyuntamientoId(valor: string): valor is AyuntamientoId {
  return PATRON_UUID.test(valor);
}

/**
 * Convierte una cadena en `AyuntamientoId`, o lanza.
 *
 * El valor tiene que venir del contexto resuelto en servidor. Nunca del
 * body, del query string, ni de un parametro de ruta.
 */
export function comoAyuntamientoId(valor: string): AyuntamientoId {
  if (!esAyuntamientoId(valor)) {
    throw new Error(
      "ayuntamiento_id invalido: se esperaba un UUID. Este valor tiene que " +
        "venir del contexto de servidor, no de la peticion.",
    );
  }

  return valor;
}
