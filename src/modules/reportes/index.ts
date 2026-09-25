/**
 * Superficie publica del modulo. El barrel crecio con cada rebanada segun
 * gano una pantalla que lo invocara -mismo criterio que evito el barrel
 * vacio hasta la primera consumidora (`superficiePublica.test.ts` cierra
 * que ningun objeto de tabla salga por aca). `./composicion` y no
 * `./application`: expone los casos de uso ya cableados con sus
 * adaptadores reales, nunca la fabrica sin componer.
 */

export { TAMANO_DE_PAGINA } from "./application/listarReportes";
/**
 * Curado y no `export type * from "./application"`: `puertos.ts` declara
 * su propio `CandidatoAOriginal` -la fila minima que
 * `repositorio.candidatoAOriginalPorFolio` devuelve, design.md seccion 8- con el
 * mismo nombre que el de `domain/duplicado.ts`, y un `export *` ambiguo
 * entre los dos rompe la compilacion.
 */
export type {
  FiltrosDeListado,
  ReporteGuardado,
  ReporteSimilar,
} from "./application/puertos";
export type { ReporteParaMapa } from "./application/puertosDeLecturaDeReportes";
export type { MovimientoGuardado } from "./application/puertosDeMovimientos";
export {
  asignarAreaDeReporte,
  buscarReportes,
  buscarReportesSimilares,
  cambiarEstadoDeReporte,
  consultarFolioDeReporte,
  historialDeReporte,
  listarReportes,
  listarReportesDeCalleEnTransaccion,
  listarReportesParaMapa,
  porcionesDeReportes,
  registrarReporte,
  reporteExisteEnTransaccion,
  reportePorId,
} from "./composicion";
export * from "./domain";
export * from "./ui";
