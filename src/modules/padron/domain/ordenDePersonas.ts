/**
 * Estado de orden de `design.md`, seccion "Ordenamiento de columnas": sale
 * de `?ordenar=columna&direccion=asc|desc` en la URL, nunca de un
 * `useState`. Tipo puro -sin Drizzle, sin Next- para que `puertos.ts` y el
 * adaptador SQL compartan la misma forma sin que ninguno de los dos la
 * redefina por su cuenta.
 *
 * Una sola columna hoy: "persona" (apellido + nombre, el mismo orden que ya
 * usa `listar` por defecto). CURP no entra -`design.md`: "no todas las
 * columnas ordenan", una columna que no tiene un orden natural que el
 * operador reconozca no es clicable.
 */
export type CampoDeOrdenDePersonas = "persona";

export type DireccionDeOrden = "asc" | "desc";

export type OrdenDePersonas = {
  readonly campo: CampoDeOrdenDePersonas;
  readonly direccion: DireccionDeOrden;
};
