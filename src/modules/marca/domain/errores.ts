/**
 * Los errores de negocio de `marca`. Viven en el dominio y no en `ui/` para
 * que la pantalla y el borde compartan el mismo tipo, igual que los de
 * `usuarios`.
 */

/**
 * S2 de `marca-exportacion-ux`: la operadora pidio restablecer los colores
 * sin marcar la casilla. No es un formulario mal formado —es «no
 * confirmo»—, y por eso tiene su propio error y su propia oracion.
 */
export class RestablecimientoSinConfirmarError extends Error {
  readonly codigo = "RESTABLECIMIENTO_SIN_CONFIRMAR";

  constructor(
    mensaje = "Para restablecer los colores, marque la casilla de confirmación.",
  ) {
    super(mensaje);
    this.name = "RestablecimientoSinConfirmarError";
  }
}

/**
 * S7 de `marca-exportacion-ux`: quitar el escudo sin la casilla. Misma forma
 * y mismo motivo que el restablecimiento: sin JavaScript no hay dialogo que
 * pregunte antes, asi que la pregunta es la casilla y el borde la vuelve a
 * exigir. Sin ella no se escribe la fila ni se borra el objeto guardado.
 */
export class QuitarEscudoSinConfirmarError extends Error {
  readonly codigo = "QUITAR_ESCUDO_SIN_CONFIRMAR";

  constructor(
    mensaje = "Para quitar el escudo, marque la casilla de confirmación.",
  ) {
    super(mensaje);
    this.name = "QuitarEscudoSinConfirmarError";
  }
}
