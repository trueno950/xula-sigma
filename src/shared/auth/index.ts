/**
 * Superficie publica de auth.
 *
 * **No exporta `conAuth` ni `construirInstancia`.** Quien las necesite
 * esta adentro de `shared/auth`; desde afuera no hay forma de construir
 * una instancia de Better Auth, que es la segunda de las tres capas del
 * diseno (seccion 1). La primera es la regla de dependency-cruiser que
 * confina `better-auth` a este directorio; la tercera es que toda
 * operacion corre adentro de `withTenant`.
 *
 * Tampoco exporta el esquema. Las tablas se importan por ruta directa
 * desde los tests de aislamiento y desde `drizzle.config.ts`; ofrecerlas
 * aca invitaria a consultarlas desde cualquier capa en vez de por un
 * puerto.
 */

export {
  CuentaCambiadaError,
  RestablecimientoPropioError,
  restablecerContrasenia,
} from "./administracionDeUsuarios";
export { altaDePersona } from "./alta";
export { darDeBajaUsuario } from "./bajaDeUsuario";
export {
  CambioDeClaveVencidoError,
  ClaveRepetidaError,
  cambiarClavePropia,
  RUTA_DE_CAMBIO_DE_CLAVE,
} from "./cambioDeClave";
export {
  ALFABETO_DE_CLAVE_TEMPORAL,
  generarClaveTemporal,
  LARGO_DE_CLAVE_TEMPORAL,
} from "./claveTemporal";
export {
  type ContextoActual,
  type ContextoDeCambioDeClave,
  contextoActual,
  contextoDeCambioDeClave,
} from "./contexto";
export {
  ClaveDebilError,
  hashDeClave,
  LARGO_MINIMO,
  verificarClave,
} from "./contrasenia";
export { manejarAuth } from "./instancia";
export { CuentaActivaError, reactivarUsuario } from "./reactivacionDeUsuario";
export {
  esRol,
  puedeAdministrarUsuarios,
  puedeDarDeBaja,
  puedeEscribir,
  puedeReactivarCuenta,
  puedeRestablecerContrasenia,
  ROLES,
  type Rol,
} from "./roles";
