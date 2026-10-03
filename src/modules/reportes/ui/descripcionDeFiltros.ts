import type { FiltrosDeListado } from "../application/puertos";
import {
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
} from "../domain";

/**
 * Nombra cada filtro aplicado para el vacio por filtro: con solo `q` en el
 * mensaje, un listado vacio por `estado` o `tipo` no decia por que.
 */
export const descripcionDeFiltrosDeReportes = (
  { estado, tipo }: FiltrosDeListado,
  q: string | undefined,
): string | undefined => {
  const partes = [
    estado ? `Estado "${ETIQUETA_DE_ESTADO_DE_REPORTE[estado]}"` : null,
    tipo ? `tipo "${ETIQUETA_DE_TIPO_DE_INCIDENCIA[tipo]}"` : null,
    q ? `búsqueda "${q}"` : null,
  ].filter((parte) => parte !== null);

  return partes.length > 0 ? partes.join(", ") : undefined;
};
