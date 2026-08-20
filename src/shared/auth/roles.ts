/**
 * Los cuatro roles de la plataforma y las reglas puras que los consumen.
 *
 * **Sin IO.** Ni base, ni sesion, ni request: entra rol, sale booleano. La
 * separacion la manda el diseno D1 — la regla es pura, obtener el rol es
 * infraestructura (`sesion.ts`) y verificarlo es del caso de uso. Ocultar
 * un boton no es autorizacion (`05-seguridad.md` seccion 6).
 *
 * **Un modulo de negocio NO importa esto.** Cuando `padron` necesite
 * "¿este rol puede exportar el padron?", declara su propia union en su
 * `domain/` y la duplica: `domain` no importa nada, ni siquiera `shared`.
 * Cuatro lineas duplicadas cuestan menos que perder la pureza de la capa.
 */
export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN_MUNICIPAL",
  "OPERADOR",
  "CONSULTA",
] as const;

export type Rol = (typeof ROLES)[number];

/**
 * Ningun rol toca a un `SUPER_ADMIN`.
 *
 * El spec dice que `ADMIN_MUNICIPAL` administra "cualquier usuario de su
 * propio ayuntamiento", escrito pensando en un municipio normal, donde no
 * vive ningun `SUPER_ADMIN`. El ayuntamiento reservado de plataforma si los
 * tiene, y ahi la lectura literal es una escalada: el `ADMIN_MUNICIPAL` de
 * ese ayuntamiento le restablece la contrasenia al `SUPER_ADMIN` y se queda
 * con la plataforma entera.
 *
 * Se cierra por rol y no por ayuntamiento porque estas reglas no saben en
 * que municipio corren — esa es la condicion de ser puras. La cuenta de
 * `SUPER_ADMIN` se recupera fuera del sistema, como el seed que la creo.
 */
const esIntocable = (rol: Rol) => rol === "SUPER_ADMIN";

/** Administrar usuarios es alta, baja y restablecimiento. */
export const puedeAdministrarUsuarios = (rol: Rol) => rol === "ADMIN_MUNICIPAL";

/** `CONSULTA` es el unico de solo lectura. */
export const puedeEscribir = (rol: Rol) => rol !== "CONSULTA";

/**
 * `SUPER_ADMIN` restablece **unicamente** la cuenta `ADMIN_MUNICIPAL` de un
 * ayuntamiento. Es la unica accion que tiene sobre datos de un municipio, y
 * existe para un solo caso: el municipio cuyo administrador quedo afuera y
 * no tiene a quien pedirle que lo deje entrar.
 */
export const puedeRestablecerContrasenia = (actor: Rol, objetivo: Rol) => {
  if (actor === "SUPER_ADMIN") return objetivo === "ADMIN_MUNICIPAL";

  return puedeAdministrarUsuarios(actor) && !esIntocable(objetivo);
};

/**
 * La baja es solo del `ADMIN_MUNICIPAL` sobre su propia gente.
 *
 * `SUPER_ADMIN` queda afuera a proposito: restablecer al `ADMIN_MUNICIPAL`
 * lo destraba, darlo de baja dejaria al municipio sin nadie que lo
 * administre. Esa decision es del municipio, no de la plataforma.
 */
export const puedeDarDeBaja = (actor: Rol, objetivo: Rol) =>
  puedeAdministrarUsuarios(actor) && !esIntocable(objetivo);

/**
 * Llevarse los datos del municipio en formato abierto.
 *
 * Solo el `ADMIN_MUNICIPAL`, y `SUPER_ADMIN` queda afuera a proposito. Una
 * exportacion completa es la superficie con mas datos personales del
 * sistema: quien opera la plataforma no tiene por que poder sacar el padron
 * de un municipio, y menos sin que el municipio se entere. Es la misma
 * linea que traza `puedeAdministrarUsuarios`, por la misma razon.
 */
export const puedeExportar = (rol: Rol) => rol === "ADMIN_MUNICIPAL";
