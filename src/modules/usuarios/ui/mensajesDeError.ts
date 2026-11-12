/**
 * El error de una accion del panel, tal como viaja en la URL y tal como se
 * le muestra a la operadora.
 *
 * **En la URL va el codigo, nunca el texto.** `?error=` lo escribe
 * cualquiera desde la barra de direcciones, y pintarlo tal cual es reflejar
 * texto ajeno en la pantalla del municipio; ademas, un mensaje en la URL
 * queda en el historial y en el log de accesos. Los mensajes viven aca, que
 * es codigo del servidor, y la lista de codigos es cerrada: lo que no esta
 * en ella no muestra nada.
 *
 * La redaccion es la de `AGENTS.md`: en espaniol, para la operadora, nunca
 * el texto de la excepcion.
 */
export const CODIGOS_DE_ERROR = [
  /** El formulario llego incompleto o mal formado. */
  "formulario",
  /** El alta no trae rol elegido: es el unico campo opcional del `<select>`. */
  "sin-rol",
  /** Falta el `usuarioId` sobre el que actuar. */
  "sin-destinatario",
  "sin-permiso",
  /** S7: el recurso no existe para quien pregunta, nunca 403. */
  "no-encontrado",
  /** S3: solo operador y consulta. */
  "rol-no-asignable",
  "correo-ya-registrado",
  "generico-alta",
  "generico-restablecimiento",
  "generico-baja",
] as const;

export type CodigoDeError = (typeof CODIGOS_DE_ERROR)[number];

const MENSAJES: Record<CodigoDeError, string> = {
  formulario: "Faltan el nombre o el correo.",
  "sin-rol": "Elija un rol.",
  "sin-destinatario": "Falta la persona.",
  "sin-permiso": "No tiene permiso para esta operación.",
  "no-encontrado": "El recurso no existe.",
  "rol-no-asignable":
    "Desde el panel solo se dan de alta operadores y consultas.",
  "correo-ya-registrado":
    "Ya hay una persona con ese correo en este ayuntamiento.",
  "generico-alta": "No se pudo completar el alta. Intente de nuevo.",
  "generico-restablecimiento":
    "No se pudo restablecer la contraseña. Intente de nuevo.",
  "generico-baja": "No se pudo dar de baja a la persona. Intente de nuevo.",
};

export const esCodigoDeError = (valor: unknown): valor is CodigoDeError =>
  typeof valor === "string" &&
  (CODIGOS_DE_ERROR as readonly string[]).includes(valor);

/** El mensaje de la operadora, o `null` si el parametro no es un codigo. */
export const mensajeDeError = (valor: unknown): string | null =>
  esCodigoDeError(valor) ? MENSAJES[valor] : null;
