type ConPadre = { readonly id: string; readonly padreId?: string | null };

/**
 * Los ids que cuelgan de los dados, a cualquier profundidad y una sola vez
 * cada uno. No incluye los ids de partida.
 *
 * Se baja por niveles y no con recursion porque el arbol llega ya plano en
 * memoria; y se lleva un conjunto de visitados porque una fila con
 * `padreId` colgado en ciclo -que el `CHECK` de raiz todavia no impide-
 * colgaria el render en vez de devolver un conjunto raro.
 */
export const descendientesDe = (
  ids: readonly string[],
  lugares: readonly ConPadre[],
): readonly string[] => {
  const vistos = new Set<string>(ids);
  let frontera: readonly string[] = ids;
  const descendientes: string[] = [];

  while (frontera.length > 0) {
    const siguiente = lugares
      .filter((lugar) => lugar.padreId && frontera.includes(lugar.padreId))
      .filter((lugar) => !vistos.has(lugar.id));

    for (const lugar of siguiente) {
      vistos.add(lugar.id);
      descendientes.push(lugar.id);
    }
    frontera = siguiente.map((lugar) => lugar.id);
  }

  return descendientes;
};

/**
 * Cuantos lugares quedan por debajo de los que la fila ya muestra.
 *
 * Contaba un solo nivel -los hijos de los hijos-, asi que un municipio con
 * comisaria, seccion y manzana declaraba menos lugares de los que esconde.
 * La etiqueta dice "mas adentro", no "un nivel mas adentro".
 */
export const masAdentroDe = (
  ids: readonly string[],
  lugares: readonly ConPadre[],
): number => descendientesDe(ids, lugares).length;
