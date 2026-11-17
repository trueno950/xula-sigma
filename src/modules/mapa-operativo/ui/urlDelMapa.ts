import type { PanelDeCalles } from "../domain";

/** La ruta de la pantalla; `?panel=` y los filtros se agregan uno por uno. */
export const RUTA_DEL_MAPA = "/mapa-operativo";

export type ParametrosDelMapa = {
  tipo?: string | undefined;
  estado?: string | undefined;
  area?: string | undefined;
  lugar?: string | undefined;
};

/**
 * La direccion de la misma pantalla con otro juego de filtros y otra pestana.
 * Existe porque tres cosas de la pantalla -los chips, las pestanas y el vacio
 * por filtro- son la misma URL: si cada una la arma a mano, quitar un filtro
 * en una se lleva puesto un parametro que la otra conservaba.
 */
export const hrefDelMapa = (
  filtros: ParametrosDelMapa,
  panel?: PanelDeCalles,
): string => {
  const parametros = new URLSearchParams();
  for (const clave of ["lugar", "tipo", "estado", "area"] as const) {
    const valor = filtros[clave];
    if (valor) parametros.set(clave, valor);
  }
  if (panel) parametros.set("panel", panel);
  const cadena = parametros.toString();
  return cadena === "" ? RUTA_DEL_MAPA : `${RUTA_DEL_MAPA}?${cadena}`;
};
