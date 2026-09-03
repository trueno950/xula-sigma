/**
 * A que indice mueven las flechas, en un ciclo que envuelve. No usa el
 * estado de React a proposito: `setActiva(previa => ...)` necesita esta
 * cuenta pura para no perder una tecla si dos eventos caen en el mismo
 * tick.
 */
export const siguienteIndice = (activa: number, total: number): number =>
  (activa + 1) % total;

export const indicePrevio = (activa: number, total: number): number =>
  activa <= 0 ? total - 1 : activa - 1;
