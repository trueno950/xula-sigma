export {
  AREAS_RESPONSABLES,
  type AreaResponsable,
} from "./areaResponsable";
export {
  type ConsultaDeReporte,
  type FilaDeConsulta,
  proyectarConsulta,
  SIN_REGISTRO,
} from "./consulta";
export {
  type CandidatoAOriginal,
  originalDe,
  vincularDuplicado,
} from "./duplicado";
export {
  DuplicadoDeSiMismoError,
  DuplicadoSinOriginalError,
  ReportanteDadoDeBajaError,
  ReporteCerradoError,
  TransicionInvalidaError,
  UbicacionInvalidaError,
} from "./errores";
export {
  ESTADOS_DE_REPORTE,
  type EstadoDeReporte,
  esTerminal,
  transicionValida,
} from "./estado";
export { Folio, PREFIJO_DE_REPORTE } from "./folio";
export {
  comoMovimientoId,
  comoReporteId,
  type MovimientoId,
  type ReporteId,
} from "./identificadores";
export { MOTIVOS_DE_RECHAZO, type MotivoDeRechazo } from "./motivos";
export type {
  CampoDeOrdenDeReportes,
  DireccionDeOrden,
  OrdenDeReportes,
} from "./ordenDeReportes";
export { resolverPagina } from "./paginacion";
export {
  TIPOS_DE_INCIDENCIA,
  type TipoDeIncidencia,
} from "./tipoDeIncidencia";
