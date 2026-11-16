import { TAMANO_DE_PAGINA } from "../application/listarReportes";
import type { FiltrosDeLaBandeja } from "../application/puertos";
import type { OrdenDeReportes } from "../domain";

type ParametrosDeListado = {
  readonly filtros?: FiltrosDeLaBandeja | undefined;
  readonly q?: string | undefined;
  /** El «solo atrasados» de S1: en la URL es `?atrasados=1`, nunca el corte. */
  readonly soloAtrasados?: boolean | undefined;
  readonly limite?: number | undefined;
  readonly orden?: OrdenDeReportes | undefined;
};

/**
 * El `?estado=&tipo=&area=&lugar=&q=&atrasados=&ordenar=&direccion=&limite=` de
 * `/reportes`, sin cliente (`design.md`, "Filtros", "Buscador" y
 * "Ordenamiento de columnas"): el encabezado ordenable, "Ver mas" y la "x"
 * de cada chip son links con query params, nunca `useState` -mismo criterio
 * que `padron/ui/hrefsDeListado.ts`.
 *
 * `limite` se omite cuando es el default para no ensuciar la URL de todo
 * `/reportes` sin filtrar. `atrasados` viaja como un uno y nunca como la
 * fecha de corte: el corte depende del umbral del municipio y del dia de
 * hoy, asi que se resuelve en el servidor al leer la URL.
 */
export function construirHrefDeListado(
  parametros: ParametrosDeListado,
): string {
  const query = new URLSearchParams();

  if (parametros.filtros?.estado)
    query.set("estado", parametros.filtros.estado);
  if (parametros.filtros?.tipo) query.set("tipo", parametros.filtros.tipo);
  if (parametros.filtros?.area) query.set("area", parametros.filtros.area);
  if (parametros.filtros?.lugar) query.set("lugar", parametros.filtros.lugar);
  if (parametros.q) query.set("q", parametros.q);
  if (parametros.soloAtrasados) query.set("atrasados", "1");
  if (parametros.orden) {
    query.set("ordenar", parametros.orden.campo);
    query.set("direccion", parametros.orden.direccion);
  }
  if (parametros.limite && parametros.limite !== TAMANO_DE_PAGINA) {
    query.set("limite", String(parametros.limite));
  }

  const cadena = query.toString();
  return cadena ? `/reportes?${cadena}` : "/reportes";
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
 * La "x" de un chip de filtro (`design.md`, "Filtros"): quita solo `campo`
 * y conserva el resto -el otro select, la busqueda, el orden. `orden` y
 * `limite` se sueltan a proposito, mismo criterio que el formulario
 * combinado de `FiltrosDeReportes`: una navegacion que cambia el criterio
 * de filtrado vuelve a la primera pagina en el orden por defecto.
 */
export function hrefSinFiltro(
  parametros: ParametrosDeListado,
  campo: "estado" | "tipo" | "area" | "lugar" | "atrasados",
): string {
  const sinAtrasados = { filtros: parametros.filtros, q: parametros.q };

  if (campo === "atrasados") return construirHrefDeListado(sinAtrasados);

  const filtros = { ...parametros.filtros };
  delete filtros[campo];

  return construirHrefDeListado({ filtros, q: parametros.q });
}
