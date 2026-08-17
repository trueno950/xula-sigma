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

export { altaDePersona } from "./alta";
export {
  ClaveDebilError,
  hashDeClave,
  LARGO_MINIMO,
  verificarClave,
} from "./contrasenia";
export { manejarAuth } from "./instancia";
export { ROLES, type Rol } from "./roles";
export { sesionActual } from "./sesion";
