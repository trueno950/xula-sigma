/**
 * Señal de vida del proceso. **No consulta la base y no resuelve tenant.**
 *
 * Eso es justamente lo que la hace util: responde en cualquier superficie
 * —incluido el dominio pelado, donde no hay municipio— y antes de que exista
 * un solo ayuntamiento sembrado. Playwright la usa para saber cuando el
 * servidor esta listo; sin ella el chequeo tenia que pegarle a `/acceso` de
 * un municipio, que no existe hasta que corre la siembra, y la siembra corre
 * despues de arrancar el servidor.
 *
 * Que no toque la base tambien la vuelve honesta como healthcheck de
 * despliegue: dice "el proceso levanto", que es lo unico que puede saber.
 * Una que consultara Postgres reportaria caido el servicio entero por un
 * problema de la base, y ahi lo que hay que hacer es distinto.
 */
export function GET() {
  return Response.json({ estado: "vivo" });
}
