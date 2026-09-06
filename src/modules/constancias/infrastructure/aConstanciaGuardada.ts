import type { ConstanciaGuardada } from "../application/puertos";
import { comoConstanciaId } from "../domain";
import type { constancias } from "./esquema";

/**
 * Aparte de `repositorioDeConstanciasSql.ts` porque `buscarPorId`/
 * `bloquearPorId` (ese archivo) y `listar`/`buscar`
 * (`listadoDeConstanciasSql.ts`) lo necesitan los dos: un archivo
 * compartido evita el ciclo que se armaria si uno le importara el
 * mapeador al otro. Mismo criterio que `reportes/infrastructure/aReporteGuardado.ts`.
 */
export const aConstanciaGuardada = (
  fila: typeof constancias.$inferSelect,
): ConstanciaGuardada => ({
  ...fila,
  id: comoConstanciaId(fila.id),
  datos: fila.datos as Record<string, unknown>,
});
