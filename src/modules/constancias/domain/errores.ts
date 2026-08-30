/**
 * Errores de dominio de `constancias`. Mismo patron que
 * `shared/lib/errores.ts` y `territorio/domain/errores.ts`: clase, `codigo`
 * estable y `name`, sin logica adentro.
 */

/** `emitirConstancia` rechaza si la persona no tiene residencia vigente. */
export class SinResidenciaVigenteError extends Error {
  readonly codigo = "SIN_RESIDENCIA_VIGENTE";

  constructor(mensaje = "La persona no tiene una residencia vigente.") {
    super(mensaje);
    this.name = "SinResidenciaVigenteError";
  }
}

/**
 * `emitirConstancia` rechaza si el ayuntamiento no configuro su bloque de
 * firma (decision 19 de `proposal.md`: sin firmante no se emite).
 */
export class DocumentosNoConfiguradosError extends Error {
  readonly codigo = "DOCUMENTOS_NO_CONFIGURADOS";

  constructor(
    mensaje = "El ayuntamiento no tiene configurado el bloque de firma.",
  ) {
    super(mensaje);
    this.name = "DocumentosNoConfiguradosError";
  }
}

/** `emitirConstancia` rechaza si la persona tiene baja logica en `padron`. */
export class TitularDadoDeBajaError extends Error {
  readonly codigo = "TITULAR_DADO_DE_BAJA";

  constructor(mensaje = "La persona esta dada de baja.") {
    super(mensaje);
    this.name = "TitularDadoDeBajaError";
  }
}

/** `reimprimirConstancia` rechaza si la constancia ya esta cancelada. */
export class DocumentoCanceladoError extends Error {
  readonly codigo = "DOCUMENTO_CANCELADO";

  constructor(mensaje = "El documento esta cancelado.") {
    super(mensaje);
    this.name = "DocumentoCanceladoError";
  }
}

/**
 * El renderizador rechaza si `plantillaVersion` no esta en `PLANTILLAS`
 * (design.md seccion 11): borrar una version rompe visiblemente el render
 * de los documentos que la citan, en vez de reimprimirlos con la plantilla
 * actual.
 */
export class PlantillaDesconocidaError extends Error {
  readonly codigo = "PLANTILLA_DESCONOCIDA";

  constructor(mensaje = "La version de plantilla del documento no existe.") {
    super(mensaje);
    this.name = "PlantillaDesconocidaError";
  }
}
