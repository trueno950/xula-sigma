/**
 * Los dos errores propios de la administracion de usuarios desde el panel.
 *
 * Llevan `codigo` como los de `shared/lib/errores.ts` —el despacho se hace
 * por ahi, nunca por `instanceof`, porque un error que cruza un limite de
 * serializacion pierde su prototipo— pero no viven alla: son de negocio, y
 * ese archivo es el de los transversales. Quien los conoce es la accion, que
 * los redacta con su lista blanca; `mapearError` los mandaria al generico
 * porque no estan en su lista, y para esta pantalla el mensaje util es el
 * del error.
 */

/** S3: un correo ya registrado en el ayuntamiento. */
export class CorreoYaRegistradoError extends Error {
  readonly codigo = "CORREO_YA_REGISTRADO";

  constructor(
    mensaje = "Ya hay una persona con ese correo en este ayuntamiento.",
  ) {
    super(mensaje);
    this.name = "CorreoYaRegistradoError";
  }
}

/** S3: solo se dan de alta `OPERADOR` y `CONSULTA` desde el panel. */
export class RolNoAsignableError extends Error {
  readonly codigo = "ROL_NO_ASIGNABLE";

  constructor(
    mensaje = "Desde el panel solo se dan de alta operadores y consultas.",
  ) {
    super(mensaje);
    this.name = "RolNoAsignableError";
  }
}
