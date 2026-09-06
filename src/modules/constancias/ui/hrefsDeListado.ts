import { TAMANO_DE_PAGINA } from "../application/listarConstancias";
import type { FiltrosDeListado } from "../application/puertos";
import type { OrdenDeConstancias } from "../domain";

type ParametrosDeListado = {
  readonly filtros?: FiltrosDeListado | undefined;
  readonly q?: string | undefined;
  readonly limite?: number | undefined;
  readonly orden?: OrdenDeConstancias | undefined;
};

/**
 * El `?estado=&q=&ordenar=&direccion=&limite=` de `/constancias`, sin
 * cliente (`design.md`, "Filtros", "Buscador" y "Ordenamiento de
 * columnas"): el encabezado ordenable, "Ver mas" y la "x" del chip son
 * links con query params, nunca `useState` -mismo criterio que
 * `reportes/ui/hrefsDeListado.ts`.
 *
 * `limite` se omite cuando es el default para no ensuciar la URL de todo
 * `/constancias` sin filtrar.
 */
export function construirHrefDeListado(
  parametros: ParametrosDeListado,
): string {
  const query = new URLSearchParams();

  if (parametros.filtros?.estado)
    query.set("estado", parametros.filtros.estado);
  if (parametros.q) query.set("q", parametros.q);
  if (parametros.orden) {
    query.set("ordenar", parametros.orden.campo);
    query.set("direccion", parametros.orden.direccion);
  }
  if (parametros.limite && parametros.limite !== TAMANO_DE_PAGINA) {
    query.set("limite", String(parametros.limite));
  }

  const cadena = query.toString();
  return cadena ? `/constancias?${cadena}` : "/constancias";
}

/**
 * El link "Ver mas": mismos filtros, busqueda y orden, `limite` actual mas
 * un tamano de pagina. Nunca resta ni reinicia.
 */
export function hrefDeVerMas(parametros: ParametrosDeListado): string {
  const limiteActual = parametros.limite ?? TAMANO_DE_PAGINA;

  return construirHrefDeListado({
    ...parametros,
    limite: limiteActual + TAMANO_DE_PAGINA,
  });
}

/**
 * La "x" del chip de estado (`design.md`, "Filtros"): quita el filtro y
 * conserva la busqueda -orden y limite se sueltan a proposito, mismo
 * criterio que `hrefSinFiltro` de `reportes`: una navegacion que cambia el
 * criterio de filtrado vuelve a la primera pagina en el orden por defecto.
 *
 * Sin parametro `campo`, a diferencia de `reportes`: `FiltrosDeListado` de
 * este modulo tiene un solo campo filtrable (`estado`, sin `tipo` -decision
 * de arriba), y una union de un solo valor es la misma abstraccion
 * especulativa que `AGENTS.md` pide no escribir.
 */
export function hrefSinEstado(
  parametros: Pick<ParametrosDeListado, "q">,
): string {
  return construirHrefDeListado({ q: parametros.q });
}
