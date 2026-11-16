/**
 * Errores de dominio de `intervenciones` que no son de su propio catalogo de
 * estados, mismo patron que `estado.ts`: clase, `codigo` estable y `name`.
 */

/**
 * `programarObraDeReporte` rechaza un reporte que ya esta `RESUELTO` o
 * `RECHAZADO`. Un reporte cerrado no admite obra nueva: su historia ya
 * termino, y programarla dejaria una intervencion ligada a un hecho que el
 * municipio dio por concluido.
 */
export class ReporteNoProgramableError extends Error {
  readonly codigo = "REPORTE_NO_PROGRAMABLE";

  constructor(
    mensaje = "El reporte ya está cerrado; no se puede programar obra sobre él.",
  ) {
    super(mensaje);
    this.name = "ReporteNoProgramableError";
  }
}
