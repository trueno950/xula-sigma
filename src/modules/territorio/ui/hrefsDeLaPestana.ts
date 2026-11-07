import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "../application/registroDeDomicilios";
import type { LugarId } from "../domain";
import { rutaDe } from "./contenido";

/** Lo que una pestana con lista conserva entre paginas: `?q=` y `?limite=`. */
export type FiltrosDeLaPestana = {
  readonly busqueda?: string | undefined;
  readonly limite?: number | undefined;
};

type PestanaConLista = FiltrosDeLaPestana & {
  readonly raizId: LugarId;
  readonly nodoId: LugarId;
  readonly vista: "calles" | "domicilios";
};

/**
 * Agrega `?q=` y `?limite=` a una ruta del arbol, que siempre trae ya su
 * `?raiz=`. El limite de la primera pagina se omite, mismo criterio que
 * `construirHrefDeDomicilios`.
 */
export const conFiltrosDeLaPestana = (
  ruta: string,
  { busqueda, limite }: FiltrosDeLaPestana,
): string => {
  const query = new URLSearchParams();

  if (busqueda) query.set("q", busqueda);
  if (limite && limite !== TAMANO_DE_PAGINA) {
    query.set("limite", String(limite));
  }

  const cadena = query.toString();
  return cadena ? `${ruta}&${cadena}` : ruta;
};

/**
 * "Ver mas" de Calles y Domicilios: misma busqueda, una pagina mas, y nunca
 * por encima de `LIMITE_MAXIMO`, que el esquema de la ruta descartaria
 * volviendo a la primera pagina sin avisar.
 */
export const hrefDeVerMasDeLaPestana = ({
  raizId,
  nodoId,
  vista,
  busqueda,
  limite,
}: PestanaConLista): string =>
  conFiltrosDeLaPestana(rutaDe({ raizId, nodoId, vista }), {
    busqueda,
    limite: Math.min(
      (limite ?? TAMANO_DE_PAGINA) + TAMANO_DE_PAGINA,
      LIMITE_MAXIMO,
    ),
  });
