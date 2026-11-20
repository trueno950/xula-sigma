/**
 * La cancelacion de una intervencion no se puede reabrir, y sin JavaScript no
 * hay dialogo que pregunte antes: la casilla es obligatoria en el formulario
 * y el borde la exige otra vez (S12 de `intervenciones-ux`). Un POST directo
 * a la Server Action sin ella se rechaza con este error y no cambia nada.
 */
export class CancelacionSinConfirmarError extends Error {
  readonly codigo = "CANCELACION_SIN_CONFIRMAR";

  constructor(
    mensaje = "Para cancelar la intervención, marque la casilla de confirmación.",
  ) {
    super(mensaje);
    this.name = "CancelacionSinConfirmarError";
  }
}
