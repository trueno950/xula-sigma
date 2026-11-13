/**
 * La cookie de la contrasenia temporal y el traslado que la consume (S2).
 *
 * **Vive aca, sin `next/headers` ni `node:crypto`, porque la importa el
 * proxy**, que corre antes que la pagina. `cookies().delete` solo es legal
 * en una Server Function o un Route Handler (doc de `cookies` de Next 16,
 * «Good to know»): un Server Component no puede consumir la cookie, y por
 * eso la consume el proxy —la mueve a una cabecera y la borra en la misma
 * respuesta—. La pantalla lee la cabecera y nunca la cookie.
 *
 * El nombre y la ruta se declaran una sola vez, aca. El `Path` con el que
 * se borra tiene que ser el mismo con el que se escribio: con otro, la
 * cookie sobrevive y la clave se vuelve a mostrar al recargar.
 */

export const NOMBRE_COOKIE_CLAVE_MOSTRADA = "clave-temporal-de-usuario";
export const RUTA_COOKIE_CLAVE_MOSTRADA = "/usuarios";

/**
 * La escribe el proxy y solo el proxy. El proxy borra la que mande el
 * cliente antes de decidir, igual que las cabeceras de tenant
 * (`proxy.ts`): sin eso, cualquiera inyectaria una contrasenia en la
 * pantalla de su municipio con una cabecera y un `?clave=` inventado.
 */
export const CABECERA_CLAVE_MOSTRADA = "x-xula-clave-mostrada";

/**
 * El valor de la cookie que hay que trasladar, o `null` si esta peticion no
 * la consume.
 *
 * Sin `clave` en la URL no se toca nada: recargar o volver a `/usuarios`
 * deja la cookie donde esta hasta que vence, y la pantalla no la muestra.
 */
export const claveATrasladar = ({
  ruta,
  token,
  cookie,
}: {
  ruta: string;
  token: string | undefined;
  cookie: string | undefined;
}): string | null => {
  if (ruta !== RUTA_COOKIE_CLAVE_MOSTRADA) return null;
  if (!token) return null;
  if (!cookie) return null;

  return cookie;
};
