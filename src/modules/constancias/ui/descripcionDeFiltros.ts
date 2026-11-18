import type { FiltrosDeListado } from "../application/puertos";
import {
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
  type OrdenDeConstancias,
} from "../domain";

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

const POR_FECHA = "por fecha de emisión";

/**
 * El orden con el que llego la lista: el pedido en la URL, o el default de
 * la lectura que corrio -`listadoDeConstanciasSql.ts` ordena por
 * `emitidaEn DESC` cuando no hay `?ordenar=`-, que es el unico lugar de la
 * pantalla que lo nombra.
 */
export const descripcionDelOrdenDeConstancias = (
  orden: OrdenDeConstancias | undefined,
): string => {
  if (!orden) return `${POR_FECHA}, de la más reciente a la más vieja`;

  const recientePrimero = orden.direccion === "desc";

  if (orden.campo === "folio")
    return recientePrimero
      ? "por folio, del más reciente al más viejo"
      : "por folio, del más viejo al más reciente";

  return recientePrimero
    ? `${POR_FECHA}, de la más reciente a la más vieja`
    : `${POR_FECHA}, de la más vieja a la más reciente`;
};
