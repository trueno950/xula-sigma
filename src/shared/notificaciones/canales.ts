import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";

/**
 * El canal NOTIFY/LISTEN de un municipio: `xula_sse_<ayuntamientoId>`
 * (formato canonico de design.md, `mapa-operativo-territorial`).
 *
 * Recibe el id marcado, no un `string` suelto: la unica forma de obtener un
 * `AyuntamientoId` es `comoAyuntamientoId`, que valida. No hay sobrecarga
 * que acepte un canal o un tenant de la peticion.
 */
export const canalDeTenant = (ayuntamientoId: AyuntamientoId): string =>
  `xula_sse_${ayuntamientoId}`;
