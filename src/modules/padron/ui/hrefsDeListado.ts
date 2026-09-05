import { TAMANO_DE_PAGINA } from "../application/listarPersonas";
import type { OrdenDePersonas } from "../domain";

type ParametrosDeListado = {
  readonly filtro?: string | undefined;
  readonly limite?: number | undefined;
  readonly orden?: OrdenDePersonas | undefined;
};

/**
 * El `?q=&ordenar=&direccion=&limite=` de `/padron`, sin cliente (`design.md`,
 * "Paginacion" y "Ordenamiento de columnas"): tanto el encabezado ordenable
 * como "Ver mas" son links con query params, nunca `useState`.
 *
 * `limite` se omite cuando es el default -`TAMANO_DE_PAGINA`- para no
 * ensuciar la URL de todo `/padron` sin filtrar; los demas links (orden,
 * "Ver mas" desde la primera pagina) siguen resolviendo igual sin el.
 */
export function construirHrefDeListado(
  parametros: ParametrosDeListado,
): string {
  const query = new URLSearchParams();

  if (parametros.filtro) query.set("q", parametros.filtro);
  if (parametros.orden) {
    query.set("ordenar", parametros.orden.campo);
    query.set("direccion", parametros.orden.direccion);
  }
  if (parametros.limite && parametros.limite !== TAMANO_DE_PAGINA) {
    query.set("limite", String(parametros.limite));
  }

  const cadena = query.toString();
  return cadena ? `/padron?${cadena}` : "/padron";
}

/**
 * El link "Ver mas": mismo filtro y orden, `limite` actual mas un tamano de
 * pagina. Nunca resta ni reinicia -"sigue leyendo donde se quedo".
 */
export function hrefDeVerMas(parametros: ParametrosDeListado): string {
  const limiteActual = parametros.limite ?? TAMANO_DE_PAGINA;

  return construirHrefDeListado({
    ...parametros,
    limite: limiteActual + TAMANO_DE_PAGINA,
  });
}
