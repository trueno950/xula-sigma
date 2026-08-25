/**
 * Los cuatro roles de la plataforma y las reglas puras que los consumen.
 *
 * **Sin IO.** Ni base, ni sesion, ni request: entra rol, sale booleano. La
 * separacion la manda el diseno D1 — la regla es pura, obtener el rol es
 * infraestructura (`sesion.ts`) y verificarlo es del caso de uso. Ocultar
 * un boton no es autorizacion (`05-seguridad.md` seccion 6).
 *
 * **`domain` no importa esto** — ni esto ni nada de `shared`, es la capa que
 * no importa nada. `application`, `infrastructure` y `ui` de un modulo si
 * pueden: la tabla de capas de `AGENTS.md` ya los deja importar `shared`, y
 * `puedeEscribir`, `puedeExportar`, `puedeCambiarMarca` y
 * `puedeFusionarPersonas` -mas abajo- ya viven aca e importados directo por
 * `padron`/`marca`. Si un permiso alguna vez necesita logica que solo tiene
 * sentido dentro de un modulo, ahi si se declara en su `domain/` propio.
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

/**
 * El escudo es la identidad institucional del municipio: que lo cambie
 * quien opera la plataforma es una superficie de suplantacion. `SUPER_ADMIN`
 * queda afuera a proposito, como en `puedeExportar`. `OPERADOR` tambien
 * queda afuera: la marca no es operacion.
 */
export const puedeCambiarMarca = (rol: Rol) => rol === "ADMIN_MUNICIPAL";

/**
 * Fusionar (o revertir la fusion de) dos personas reescribe la identidad
 * del padron. Mismo criterio que `puedeExportar`: solo el municipio, nunca
 * `SUPER_ADMIN`.
 */
export const puedeFusionarPersonas = (rol: Rol) => rol === "ADMIN_MUNICIPAL";

/**
 * Reparentear un lugar reescribe la jerarquia territorial. Mismo criterio
 * que `puedeFusionarPersonas`: solo el municipio, nunca `SUPER_ADMIN`
 * (`specs/autorizacion-roles/spec.md`). Alta, edicion y baja de un lugar
 * siguen bajo `puedeEscribir` -son trabajo de mostrador, no de estructura,
 * mismo spec-, no esta regla.
 */
export const puedeAdministrarTerritorio = (rol: Rol) =>
  rol === "ADMIN_MUNICIPAL";
