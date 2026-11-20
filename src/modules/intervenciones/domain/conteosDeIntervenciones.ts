import { ESTADOS_DE_INTERVENCION, type EstadoDeIntervencion } from "./estado";

/**
 * Una fila del `GROUP BY` por estado: lo que devuelve Postgres.
 *
 * `intervenciones-ux` S2: el tablero cuenta con la base y no con las filas
 * que trajo la pagina, porque un estado con mas obras de las que caben en su
 * columna tiene que decir cuantas son todas, no cuantas se ven.
 */
export type FilaDeConteoDeIntervencion = {
  readonly estado: EstadoDeIntervencion;
  readonly conteo: number;
};

export type ConteosDeIntervenciones = {
  readonly porEstado: Readonly<Record<EstadoDeIntervencion, number>>;
  readonly total: number;
};

/**
 * Completa los cuatro estados -un estado en cero es informacion, no una fila
 * ausente- y suma el total. El orden del registro es el del catalogo, que es
 * el de las columnas del tablero.
 */
export function componerConteosDeIntervenciones(
  filas: readonly FilaDeConteoDeIntervencion[],
): ConteosDeIntervenciones {
  const porEstado = Object.fromEntries(
    ESTADOS_DE_INTERVENCION.map((estado) => [estado, 0]),
  ) as Record<EstadoDeIntervencion, number>;

  for (const fila of filas) {
    porEstado[fila.estado] = fila.conteo;
  }

  return {
    porEstado,
    total: ESTADOS_DE_INTERVENCION.reduce(
      (suma, estado) => suma + porEstado[estado],
      0,
    ),
  };
}
