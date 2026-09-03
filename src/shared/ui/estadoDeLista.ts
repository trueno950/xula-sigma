/**
 * Cual de los tres estados de lista de `DESIGN.md` corresponde.
 *
 * Es una funcion pura y no un `length === 0` en cada pantalla porque la
 * distincion que importa —vacio inicial contra vacio por filtro— es
 * justamente la que se pierde cuando cada lista la resuelve sola:
 * `/padron?q=xyz` sin resultados respondia "Todavia no hay personas en el
 * padron", mandando a dar de alta a alguien que ya estaba adentro.
 *
 * El estado "cargando" no sale de aca: no es una funcion de los datos, es
 * la ausencia de datos. Lo resuelve `loading.tsx` con un esqueleto.
 */
export type EstadoDeLista =
  | { readonly clase: "con-filas" }
  | { readonly clase: "vacio-inicial" }
  | { readonly clase: "vacio-por-filtro"; readonly filtro: string };

export const estadoDeLista = ({
  total,
  filtro,
}: {
  total: number;
  filtro?: string | undefined;
}): EstadoDeLista => {
  if (total > 0) return { clase: "con-filas" };

  const recortado = filtro?.trim();

  return recortado
    ? { clase: "vacio-por-filtro", filtro: recortado }
    : { clase: "vacio-inicial" };
};
