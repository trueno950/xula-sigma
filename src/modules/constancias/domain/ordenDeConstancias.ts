/**
 * Estado de orden de `design.md`, seccion "Ordenamiento de columnas": sale
 * de `?ordenar=columna&direccion=asc|desc` en la URL, nunca de un
 * `useState`. Tipo puro -sin Drizzle, sin Next- mismo criterio que
 * `reportes/domain/ordenDeReportes.ts`.
 *
 * Las dos columnas que se muestran son las dos que ordenan: "folio" (el
 * texto ya impreso, `VEC-2026-000123`) y "emitida" (`emitidaEn`). A
 * diferencia de `reportes`, aca no hay una tercera columna categorica que
 * quede afuera -el listado de constancias no tiene mas que estas dos.
 */
export type CampoDeOrdenDeConstancias = "folio" | "emitida";

export type DireccionDeOrden = "asc" | "desc";

export type OrdenDeConstancias = {
  readonly campo: CampoDeOrdenDeConstancias;
  readonly direccion: DireccionDeOrden;
};
