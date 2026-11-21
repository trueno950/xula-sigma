/**
 * La URL de la pantalla sin el token de la clave mostrada ni la confirmacion
 * que lo acompañaba (S9 de `usuarios-ux`). Por que hace falta sacarlos de la
 * URL al pintar la tarjeta: `AGENTS.md`, seccion Server Actions, nota de
 * `usuarios`.
 *
 * Devuelve `null` cuando la URL no trae el token: sin nada que borrar, el
 * resto de los parametros -una confirmacion de baja, un codigo de error- se
 * queda como esta.
 *
 * Devuelve una ruta del mismo host y no una URL absoluta: el panel vive en el
 * subdominio de cada municipio y no hay razon para reescribirlo.
 */
export const urlSinLaClaveMostrada = (url: URL): string | null => {
  if (!url.searchParams.has("clave")) return null;

  const limpia = new URL(url);
  limpia.searchParams.delete("clave");
  limpia.searchParams.delete("ok");

  return `${limpia.pathname}${limpia.search}${limpia.hash}`;
};
