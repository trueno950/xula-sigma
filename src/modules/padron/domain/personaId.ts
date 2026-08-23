/**
 * `PersonaId` es un `string` con marca de tipo, mismo mecanismo que
 * `AyuntamientoId` (`shared/tenancy/ayuntamientoId.ts`): sin la marca,
 * cualquier cadena entra donde se espera un id de persona sin que el
 * compilador diga nada. Deuda anotada por la ronda 4 de GGA sobre
 * `feat(padron): alta, edicion y baja de personas` — el id viajaba como
 * `string` suelto.
 *
 * `PATRON_UUID` se repite en vez de importarse de `shared/tenancy`: el
 * dominio no importa de `shared` (`docs/architecture/estructura.md`), ni
 * siquiera un regex.
 */

declare const marca: unique symbol;

export type PersonaId = string & { readonly [marca]: "PersonaId" };

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esPersonaId(valor: string): valor is PersonaId {
  return PATRON_UUID.test(valor);
}

export function comoPersonaId(valor: string): PersonaId {
  if (!esPersonaId(valor)) {
    throw new Error("persona_id invalido: se esperaba un UUID.");
  }

  return valor;
}
