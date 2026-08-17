/**
 * El origen del municipio, derivado del `Host` de la peticion.
 *
 * **Una sola funcion para las dos puertas de Better Auth**, y ese es todo
 * el punto del archivo. `manejarAuth` derivaba el origen de `request.url`
 * mientras `sesionActual` lo armaba con el `Host`: la libreria valida el
 * `Origin` de la peticion contra su `baseURL`, y con las dos puertas
 * calculando distinto el acceso fallaba con `Invalid origin`. Ningun
 * acceso funcionaba en produccion.
 *
 * La primera correccion dejo las dos derivaciones parecidas pero no
 * iguales: los respaldos diferian —`"http"` de un lado, el protocolo de la
 * URL del otro— asi que el mismo defecto seguia vivo para el caso en que
 * `x-forwarded-proto` no viene. Dos copias de una regla divergen; una sola
 * funcion no puede.
 *
 * @param respaldo De donde sale el protocolo cuando el proxy no manda
 *   `x-forwarded-proto`, y el origen entero cuando no hay `Host`. Cada
 *   puerta pasa el suyo porque una tiene la URL de la peticion y la otra
 *   solo cabeceras.
 */
export function origenDesde(cabeceras: Headers, respaldo: string): string {
  const host = cabeceras.get("host");

  if (!host) return respaldo;

  const protocolo =
    cabeceras.get("x-forwarded-proto") ??
    new URL(respaldo).protocol.replace(":", "");

  return `${protocolo}://${host}`;
}
