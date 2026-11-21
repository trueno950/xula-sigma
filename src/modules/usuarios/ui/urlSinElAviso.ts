/**
 * La URL de la pantalla sin el token del aviso de la baja ni la
 * confirmacion que lo acompaña (S14 de `usuarios-ux` con JavaScript).
 *
 * Devuelve `null` cuando el token de la URL no es el del aviso que se esta
 * pintando: sin coincidencia no hay nada que limpiar, y una URL con otro
 * `?aviso=` no se toca.
 *
 * Devuelve una ruta del mismo host y no una URL absoluta: el panel vive en el
 * subdominio de cada municipio y no hay razon para reescribirlo.
 *
 * Por que hace falta limpiar la URL y no alcanza con el proxy: `AGENTS.md`,
 * nota de `usuarios`, donde esta la explicacion completa una sola vez.
 */
export const urlSinElAviso = (url: URL, token: string): string | null => {
  if (url.searchParams.get("aviso") !== token) return null;

  const limpia = new URL(url);
  limpia.searchParams.delete("aviso");
  limpia.searchParams.delete("ok");

  return `${limpia.pathname}${limpia.search}${limpia.hash}`;
};
