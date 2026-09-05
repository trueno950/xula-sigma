/**
 * Estado de orden de `design.md`, seccion "Ordenamiento de columnas": sale
 * de `?ordenar=columna&direccion=asc|desc` en la URL, nunca de un
 * `useState`. Tipo puro -sin Drizzle, sin Next- mismo criterio que
 * `padron/domain/ordenDePersonas.ts`.
 *
 * Dos columnas con orden natural que el operador reconoce: "folio" (el
 * consecutivo impreso, `REP-2026-000123`, alfanumerico y ya ordenable tal
 * cual) y "registrado" (`registradoEn`, la fecha de alta). "tipo", "estado"
 * y "area" quedan afuera -son categorias, no un orden que alguien lea de
 * corrido (`design.md`: "no todas las columnas ordenan").
 */
export type CampoDeOrdenDeReportes = "folio" | "registrado";

export type DireccionDeOrden = "asc" | "desc";

export type OrdenDeReportes = {
  readonly campo: CampoDeOrdenDeReportes;
  readonly direccion: DireccionDeOrden;
};
