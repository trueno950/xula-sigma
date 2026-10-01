export {
  DocumentoCanceladoError,
  DocumentosNoConfiguradosError,
  PlantillaDesconocidaError,
  SinResidenciaVigenteError,
  TitularDadoDeBajaError,
} from "./errores";
export {
  ESTADOS_DE_CONSTANCIA,
  type EstadoDeConstancia,
} from "./estadoDeConstancia";
export {
  ETIQUETA_DE_ESTADO_DE_CONSTANCIA,
  ETIQUETA_DE_MOTIVO_DE_CANCELACION,
  ETIQUETA_DE_MOTIVO_DE_REIMPRESION,
} from "./etiquetas";
export { Folio } from "./folio";
export {
  type ConstanciaId,
  comoConstanciaId,
  comoReimpresionId,
  type ReimpresionId,
} from "./identificadores";
export {
  MOTIVOS_DE_CANCELACION,
  MOTIVOS_DE_REIMPRESION,
  type MotivoDeCancelacion,
  type MotivoDeReimpresion,
} from "./motivos";
export type {
  CampoDeOrdenDeConstancias,
  DireccionDeOrden,
  OrdenDeConstancias,
} from "./ordenDeConstancias";
export { resolverPagina } from "./paginacion";
export {
  PREFIJOS,
  TIPOS_DE_DOCUMENTO,
  type TipoDeDocumento,
  VERSION_ACTUAL,
} from "./tipoDeDocumento";
export {
  type FilaDeValidacion,
  NO_VALIDO,
  proyectarValidacion,
  type ResultadoDeValidacion,
} from "./validacion";
