/**
 * La regla de la contrasenia, sola y **sin una sola dependencia**.
 *
 * Vive aparte de `contrasenia.ts` porque el formulario de acceso la
 * necesita en el cliente, y `contrasenia.ts` importa `@node-rs/argon2` —un
 * binario nativo— que ademas cuelga del barril `shared/auth`, que a su vez
 * arrastra Better Auth y la conexion a Postgres. Importarla desde ahi
 * **rompe el build**: `Module not found` al intentar meter todo eso en el
 * bundle del navegador. Verificado con `pnpm build`; `tsc` no lo ve.
 *
 * Duplicar el numero en el formulario habria sido la salida facil y la
 * peor: es la misma regla que aplica el servidor con `minPasswordLength`,
 * y dos copias divergen sin que nada falle.
 */

/**
 * Doce y no ocho. Con argon2id el costo de verificar es alto, asi que el
 * ataque realista no es fuerza bruta en linea sino diccionario contra un
 * volcado. Contra eso el largo importa mas que la variedad de simbolos.
 */
export const LARGO_MINIMO = 12;
