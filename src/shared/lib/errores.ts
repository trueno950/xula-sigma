/**
 * Errores transversales. Los de negocio viven en el dominio de cada
 * modulo (`modules/<mod>/domain/errors.ts`); estos son los que puede
 * lanzar cualquier capa salvo `domain`.
 *
 * Todos llevan un `codigo` estable. El despacho se hace por ese codigo y
 * no por `instanceof`: un error que cruza un limite de modulo o que se
 * serializa hacia una Server Action pierde su prototipo, y ahi el
 * `instanceof` deja de ser cierto sin avisar.
 *
 * Ver ADR 0001 seccion 3.
 */

export class NoAutorizadoError extends Error {
  readonly codigo = "NO_AUTORIZADO";

  constructor(mensaje = "No tiene permiso para esta operacion.") {
    super(mensaje);
    this.name = "NoAutorizadoError";
  }
}

export class TenantNoResueltoError extends Error {
  readonly codigo = "TENANT_NO_RESUELTO";

  constructor(mensaje = "No se pudo determinar el ayuntamiento del acceso.") {
    super(mensaje);
    this.name = "TenantNoResueltoError";
  }
}

export class ValidacionError extends Error {
  readonly codigo = "VALIDACION";

  /**
   * Errores por campo, para que el formulario pueda pintarlos donde
   * corresponde en vez de mostrar un mensaje suelto arriba.
   */
  readonly campos: Record<string, string>;

  constructor(
    campos: Record<string, string> = {},
    mensaje = "Datos invalidos.",
  ) {
    super(mensaje);
    this.name = "ValidacionError";
    this.campos = campos;
  }
}
