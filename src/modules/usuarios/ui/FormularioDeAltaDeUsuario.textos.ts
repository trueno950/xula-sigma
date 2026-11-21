/**
 * El mínimo del nombre, dicho dos veces desde un solo lugar (S7 de
 * `odd/tasks/usuarios-ux.md`): la ayuda que se lee antes de escribir y el
 * error que devuelve el servidor cuando no se alcanza.
 *
 * El navegador no lo hace cumplir con `minLength`, ni con `required`, ni con
 * `type="email"`: esos tres contestan con su propio mensaje, en el idioma del
 * navegador —en inglés en el equipo de la auditoría— y **antes** de que el
 * POST salga, así que el mensaje en español del servidor nunca se ve. Sin
 * JavaScript la validación nativa corre igual y no hay otro mensaje. Lo hace
 * cumplir el servidor, que contesta en español con `nombre-corto` y
 * `correo-invalido` (`mensajesDeError.ts`); el correo conserva su teclado de
 * correo por `inputMode`, que no valida nada.
 */
export const MINIMO_DE_NOMBRE = 3;

export const AYUDA_DE_NOMBRE = `Al menos ${MINIMO_DE_NOMBRE} letras. Así va a aparecer en la bitácora del municipio.`;

export const MENSAJE_NOMBRE_CORTO = `El nombre debe tener al menos ${MINIMO_DE_NOMBRE} letras.`;

export const MENSAJE_CORREO_INVALIDO =
  "Escriba un correo válido, como nombre@municipio.gob.mx.";

/**
 * Los obligatorios se dicen en una línea y no con un asterisco por etiqueta:
 * cambiaría el nombre accesible que `e2e/` busca exacto, y es la forma que ya
 * tiene el alta de intervenciones.
 */
export const AVISO_DE_OBLIGATORIOS = "Todos los campos son obligatorios.";
