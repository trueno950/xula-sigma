type ConPadre<Id extends string> = {
  readonly id: Id;
  readonly padreId?: Id | null;
};

/**
 * Se baja por niveles y no con recursion porque el arbol llega ya plano en
 * memoria; y se lleva un conjunto de visitados porque una fila con
 * `padreId` colgado en ciclo -que el `CHECK` de raiz todavia no impide-
 * colgaria el render en vez de devolver un conjunto raro.
 */
export const descendientesDe = <Id extends string>(
  ids: readonly Id[],
  lugares: readonly ConPadre<Id>[],
): readonly Id[] => {
  const vistos = new Set<Id>(ids);
  let frontera: readonly Id[] = ids;
  const descendientes: Id[] = [];

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
 * Contaba un solo nivel -los hijos de los hijos-, asi que declaraba menos
 * lugares de los que esconde. La etiqueta dice "mas adentro", no "un nivel
 * mas adentro".
 */
export const masAdentroDe = <Id extends string>(
  ids: readonly Id[],
  lugares: readonly ConPadre<Id>[],
): number => descendientesDe(ids, lugares).length;
