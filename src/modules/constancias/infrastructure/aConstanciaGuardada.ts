import type { ConstanciaGuardada } from "../application/puertos";
import { nombreDelTitularDeSnapshot } from "../application/validacionDeSnapshot";
import { comoConstanciaId, derivarEstadoDeConstancia } from "../domain";
import type { constancias } from "./esquema";

/**
 * Aparte de `repositorioDeConstanciasSql.ts` porque `buscarPorId`/
 * `bloquearPorId` (ese archivo) y `listar`/`buscar`
 * (`listadoDeConstanciasSql.ts`) lo necesitan los dos: un archivo
 * compartido evita el ciclo que se armaria si uno le importara el mapeador
 * al otro. Mismo criterio que `reportes/infrastructure/aReporteGuardado.ts`.
 *
 * Es tambien el unico lugar donde una fila se traduce a `nombreDelTitular` y
 * `estado` (`constancias-ux`, S1/S7): las cuatro lecturas del modulo estrenan
 * los dos campos juntos o ninguno, y ninguno pide una segunda consulta.
 */
export const aConstanciaGuardada = (
  fila: typeof constancias.$inferSelect,
): ConstanciaGuardada => {
  const datos = fila.datos as Record<string, unknown>;

  return {
    ...fila,
    id: comoConstanciaId(fila.id),
    datos,
    nombreDelTitular: nombreDelTitularDeSnapshot(datos),
    estado: derivarEstadoDeConstancia(fila.canceladaEn),
  };
};
