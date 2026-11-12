/**
 * El panel de administracion de usuarios: listado, alta, restablecimiento y
 * baja (S1 a S7 de `odd/tasks/administracion-de-usuarios.md`).
 *
 * Modulo con sus cuatro capas, como cualquier otro:
 *
 * - `domain/` — el conjunto cerrado de roles del alta (S3), la fila del
 *   listado y los dos errores de negocio. No importa nada.
 * - `application/` — el puerto `DirectorioDeUsuarios` y los casos de uso
 *   `listarUsuarios` (S1/S2) y `altaDeUsuario` (S3/S4), con las guardas de
 *   rol y la generacion de la clave temporal.
 * - `infrastructure/` — el adaptador sobre `usuarios`: el `select` bajo RLS
 *   y el alta por la primitiva `altaDePersona` de `shared/auth`, con el
 *   choque de correo traducido a un error del dominio.
 * - `ui/` — pantalla, formularios y las tres Server Actions.
 *
 * Lo que **no** vive aca: el hash (`shared/auth/contrasenia.ts`), la regla
 * `puedeAdministrarUsuarios`, el generador de claves temporales y los casos
 * de uso de restablecimiento y baja (`shared/auth/administracionDeUsuarios.ts`).
 * Son de la plataforma, los usan otras pantallas y ya tienen sus tests de
 * aislamiento; este modulo los consume, no los reimplementa.
 */

export type { DirectorioDeUsuarios, UsuarioDadoDeAlta } from "./application";
export {
  altaDeUsuario,
  listarUsuarios,
} from "./composicion";
export type { RolAsignable, UsuarioDelPanel } from "./domain";
export { ROLES_ASIGNABLES } from "./domain";
export type {
  ClaveMostrada,
  CodigoDeError,
  ConfirmacionDeUsuarios,
} from "./ui";
export {
  AvisoDeClaveTemporal,
  CODIGOS_DE_ERROR,
  claveMostradaDeLaPeticion,
  esCodigoDeError,
  esquemaDeParametros,
  FormularioDeAltaDeUsuario,
  ListadoDeUsuarios,
  mensajeDeError,
  opcionesDeRol,
  rutaDelAltaDeUsuario,
  rutaDeUsuarios,
} from "./ui";
