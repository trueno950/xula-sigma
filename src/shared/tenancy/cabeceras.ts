/**
 * Cabeceras que `proxy.ts` escribe y el servidor lee.
 *
 * Viven en `shared/tenancy` y no en `proxy.ts` por direccion de
 * dependencias: `shared` no puede depender del punto de entrada de la
 * aplicacion. El proxy es un consumidor de tenancy, no al reves.
 *
 * El prefijo `x-xula-` no es decorativo: hace evidente en cualquier
 * volcado de cabeceras cual es nuestra y cual venia del cliente.
 */

export const CABECERA_SUPERFICIE = "x-xula-superficie";
export const CABECERA_SUBDOMINIO = "x-xula-subdominio";

/**
 * La ruta de la URL, para que el layout del panel marque el modulo activo
 * sin un componente cliente. La escribe el proxy, que es quien ya la lee.
 */
export const CABECERA_RUTA = "x-xula-ruta";
