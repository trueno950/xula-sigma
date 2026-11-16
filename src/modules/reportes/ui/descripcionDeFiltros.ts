import type { FiltrosDeLaBandeja } from "../application/puertos";
import {
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_TIPO_DE_INCIDENCIA,
} from "../domain";

type Opciones = {
  readonly soloAtrasados?: boolean | undefined;
  /**
   * Los lugares del municipio, para nombrar el elegido: el filtro viaja como
   * id y el nombre solo lo tiene la pantalla que lo ofrecio.
   */
  readonly lugares?: readonly { id: string; nombre: string }[] | undefined;
};

/**
 * Nombra cada filtro aplicado para el vacio por filtro: con solo `q` en el
 * mensaje, un listado vacio por `estado`, `tipo`, area, lugar o «solo
 * atrasados» no decia por que. Un `lugar` sin nombre resuelto no se nombra:
 * inventarle una etiqueta seria describir un filtro que la pantalla no
 * ofrecio.
 */
export const descripcionDeFiltrosDeReportes = (
  { estado, tipo, area, lugar }: FiltrosDeLaBandeja,
  q: string | undefined,
  opciones: Opciones = {},
): string | undefined => {
  const nombreDelLugar = opciones.lugares?.find(
    (candidato) => candidato.id === lugar,
  )?.nombre;

  const partes = [
    estado ? `Estado "${ETIQUETA_DE_ESTADO_DE_REPORTE[estado]}"` : null,
    tipo ? `tipo "${ETIQUETA_DE_TIPO_DE_INCIDENCIA[tipo]}"` : null,
    area ? `área "${ETIQUETA_DE_AREA[area]}"` : null,
    nombreDelLugar ? `lugar "${nombreDelLugar}"` : null,
    opciones.soloAtrasados ? "solo atrasados" : null,
    q ? `búsqueda "${q}"` : null,
  ].filter((parte) => parte !== null);

  return partes.length > 0 ? partes.join(", ") : undefined;
};
