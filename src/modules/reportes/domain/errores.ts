/**
 * Errores de dominio de `reportes`. Mismo patron que
 * `constancias/domain/errores.ts`: clase, `codigo` estable y `name`, sin
 * logica adentro (design.md seccion 7).
 */

/** `cambiarEstadoDeReporte` rechaza una transicion fuera de la tabla. */
export class TransicionInvalidaError extends Error {
  readonly codigo = "TRANSICION_INVALIDA";

  constructor(mensaje = "La transicion de estado no es valida.") {
    super(mensaje);
    this.name = "TransicionInvalidaError";
  }
}

/** `cambiarEstadoDeReporte`/`asignarAreaDeReporte` rechazan un reporte terminal. */
export class ReporteCerradoError extends Error {
  readonly codigo = "REPORTE_CERRADO";

  constructor(mensaje = "El reporte ya esta en un estado terminal.") {
    super(mensaje);
    this.name = "ReporteCerradoError";
  }
}

/** `registrarReporte` rechaza un lugar o calle inexistente o de otro tenant. */
export class UbicacionInvalidaError extends Error {
  readonly codigo = "UBICACION_INVALIDA";

  constructor(mensaje = "La ubicacion del reporte no es valida.") {
    super(mensaje);
    this.name = "UbicacionInvalidaError";
  }
}

/**
 * `cambiarEstadoDeReporte` rechaza las dos direcciones: motivo `DUPLICADO`
 * sin vinculo, o vinculo presente con otro motivo. Un solo error porque el
 * CHECK de Postgres que lo espeja tambien es uno solo (design.md seccion 7).
 */
export class DuplicadoSinOriginalError extends Error {
  readonly codigo = "DUPLICADO_SIN_ORIGINAL";

  constructor(
    mensaje = "Rechazar por DUPLICADO exige el vinculo al original.",
  ) {
    super(mensaje);
    this.name = "DuplicadoSinOriginalError";
  }
}

/**
 * `cambiarEstadoDeReporte` rechaza el ciclo de largo 1 y el de largo 2
 * (design.md seccion 8): el par en TypeScript de `reportes_sin_autoduplicado`.
 */
export class DuplicadoDeSiMismoError extends Error {
  readonly codigo = "DUPLICADO_DE_SI_MISMO";

  constructor(mensaje = "Un reporte no puede ser duplicado de si mismo.") {
    super(mensaje);
    this.name = "DuplicadoDeSiMismoError";
  }
}

/** `registrarReporte` rechaza un `personaId` con baja logica en `padron`. */
export class ReportanteDadoDeBajaError extends Error {
  readonly codigo = "REPORTANTE_DADO_DE_BAJA";

  constructor(mensaje = "El reportante esta dado de baja.") {
    super(mensaje);
    this.name = "ReportanteDadoDeBajaError";
  }
}
