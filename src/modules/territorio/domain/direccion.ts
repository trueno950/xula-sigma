import type { CalleId } from "./identificadores";

const iguales = (a: CalleId | null, b: CalleId | null): boolean =>
  a !== null && b !== null && a === b;

/**
 * Espejo en TypeScript del CHECK `domicilios_calles_distintas` (design.md
 * seccion 4): rechaza solo si dos de las tres calles presentes coinciden.
 * Una transversal nula no choca con nada -son nullable a proposito para
 * una comisaria rural, proposal.md decision 5- porque `iguales` exige que
 * las dos puntas esten presentes, mismo criterio "NULL no rechaza" que el
 * CHECK de Postgres. `altaDeDomicilio` la usa para rechazar antes de
 * escribir, en vez de dejar que el CHECK lo haga en Postgres.
 */
export const transversalesValidas = (
  calleId: CalleId,
  entreCalleAId: CalleId | null,
  entreCalleBId: CalleId | null,
): boolean =>
  !iguales(calleId, entreCalleAId) &&
  !iguales(calleId, entreCalleBId) &&
  !iguales(entreCalleAId, entreCalleBId);
