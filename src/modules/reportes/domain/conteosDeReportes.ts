import { AREAS_RESPONSABLES, type AreaResponsable } from "./areaResponsable";
import { ESTADOS_DE_REPORTE, type EstadoDeReporte } from "./estado";

/**
 * Los conteos de la bandeja de S2 de `gestion-municipal`: cuantos reportes
 * hay por estado y por area responsable **con los filtros elegidos**.
 *
 * `GROUP BY` devuelve solo las filas que existen, y la pantalla necesita los
 * cuatro estados siempre: un estado en cero es informacion -"no hay nada
 * rechazado"-, no una fila ausente. Las areas, en cambio, se muestran solo
 * las que tienen algo: seis renglones en cero son ruido, y el catalogo de
 * areas ya se ve entero en el `<select>` del filtro.
 */
export type FilaDeConteoDeEstado = {
  readonly estado: EstadoDeReporte;
  readonly conteo: number;
};

/** `area` nula es «Sin asignar»: el reporte nace sin area (decision 3). */
export type FilaDeConteoDeArea = {
  readonly area: AreaResponsable | null;
  readonly conteo: number;
};

export type ConteosDeReportes = {
  readonly porEstado: Readonly<Record<EstadoDeReporte, number>>;
  readonly porArea: readonly FilaDeConteoDeArea[];
  readonly total: number;
};

const ceroPorEstado = (): Record<EstadoDeReporte, number> =>
  Object.fromEntries(ESTADOS_DE_REPORTE.map((estado) => [estado, 0])) as Record<
    EstadoDeReporte,
    number
  >;

/**
 * Completa los ceros y ordena las areas por el catalogo, con «Sin asignar»
 * al final: el mismo orden en que el `<select>` del filtro las ofrece, para
 * que la operadora lea los conteos en el orden en que los eligio.
 */
export function componerConteos(filas: {
  porEstado: readonly FilaDeConteoDeEstado[];
  porArea: readonly FilaDeConteoDeArea[];
}): ConteosDeReportes {
  const porEstado = ceroPorEstado();
  for (const fila of filas.porEstado) {
    porEstado[fila.estado] = fila.conteo;
  }

  const conteoPorArea = new Map(
    filas.porArea.map((fila) => [fila.area ?? "", fila.conteo]),
  );
  const conNombre = AREAS_RESPONSABLES.flatMap((area) => {
    const conteo = conteoPorArea.get(area) ?? 0;
    return conteo > 0 ? [{ area, conteo }] : [];
  });
  const sinArea = conteoPorArea.get("") ?? 0;

  return {
    porEstado,
    porArea:
      sinArea > 0 ? [...conNombre, { area: null, conteo: sinArea }] : conNombre,
    total: ESTADOS_DE_REPORTE.reduce(
      (suma, estado) => suma + porEstado[estado],
      0,
    ),
  };
}
