import type { FiltrosDeListado } from "../application/puertos";
import { ETIQUETA_DE_ESTADO_DE_CONSTANCIA } from "../domain";

/**
 * Nombra cada filtro aplicado para el vacio por filtro: con solo `q` en el
 * mensaje, un listado vacio por `estado` no decia por que.
 */
export const descripcionDeFiltrosDeConstancias = (
  { estado }: FiltrosDeListado,
  q: string | undefined,
): string | undefined => {
  const partes = [
    estado ? `Estado "${ETIQUETA_DE_ESTADO_DE_CONSTANCIA[estado]}"` : null,
    q ? `búsqueda "${q}"` : null,
  ].filter((parte) => parte !== null);

  return partes.length > 0 ? partes.join(", ") : undefined;
};
