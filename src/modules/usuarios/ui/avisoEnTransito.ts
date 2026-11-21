/**
 * La cookie del aviso y el traslado que la consume (S13 y S14 de
 * `usuarios-ux`).
 *
 * **Vive aca, sin `next/headers` ni `node:crypto`, porque la importa el
 * proxy**, que corre antes que la pagina. `cookies().delete` solo es legal en
 * una Server Function o un Route Handler (doc de `cookies` de Next 16,
 * «Good to know»): un Server Component no puede consumir la cookie, y por eso
 * la consume el proxy —la mueve a una cabecera y la borra en la misma
 * respuesta—, igual que la contrasenia temporal.
 *
 * El nombre y la ruta se declaran una sola vez, aca. El `Path` con el que se
 * borra tiene que ser el mismo con el que se escribio: con otro, la cookie
 * sobrevive y el aviso se repite al recargar.
 */

import { decodificarAvisoPendiente } from "./avisoPendiente";

export const NOMBRE_COOKIE_AVISO = "aviso-de-usuarios";
export const RUTA_COOKIE_AVISO = "/usuarios";

/**
 * La escribe el proxy y solo el proxy. El proxy borra la que mande el
 * cliente antes de decidir, igual que las cabeceras de tenant
 * (`proxy.ts`): sin eso, cualquiera anunciaria una baja que no ocurrio con
 * una cabecera y un `?aviso=` inventados.
 */
export const CABECERA_AVISO = "x-xula-aviso-de-usuarios";

/**
 * El valor de la cookie que hay que trasladar, o `null` si esta peticion no
 * la consume.
 *
 * Sin `aviso` en la URL no se toca nada: recargar, volver con el boton de
 * atras o entrar de nuevo a `/usuarios` no anuncia una accion que no ocurrio
 * (S14). La cookie se queda donde esta hasta que vence, y la pantalla no la
 * lee: lee la cabecera.
 */
export const avisoATrasladar = ({
  metodo = "GET",
  ruta,
  token,
  cookie,
}: {
  metodo?: string;
  ruta: string;
  token: string | undefined;
  cookie: string | undefined;
}): string | null => {
  if (metodo !== "GET" || ruta !== RUTA_COOKIE_AVISO) return null;
  if (!token || !cookie) return null;

  return decodificarAvisoPendiente(cookie)?.token === token ? cookie : null;
};
