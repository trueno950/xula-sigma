import type { AreaResponsable } from "./areaResponsable";
import type { EstadoDeReporte } from "./estado";
import type { MotivoDeRechazo } from "./motivos";
import type { TipoDeIncidencia } from "./tipoDeIncidencia";

/**
 * Como se lee cada catalogo cerrado de `reportes` ante una persona. Un
 * `Record<Union, string>` por catalogo: sumar un miembro sin su etiqueta no
 * compila. Los codigos siguen siendo lo que viaja en la base, en los `value`
 * de los formularios y en la URL; solo lo que se muestra pasa por aca.
 */
export const ETIQUETA_DE_ESTADO_DE_REPORTE: Record<EstadoDeReporte, string> = {
  RECIBIDO: "Recibido",
  EN_ATENCION: "En atención",
  RESUELTO: "Resuelto",
  RECHAZADO: "Rechazado",
};

export const ETIQUETA_DE_AREA: Record<AreaResponsable, string> = {
  OBRAS_PUBLICAS: "Obras públicas",
  ALUMBRADO_PUBLICO: "Alumbrado público",
  AGUA_POTABLE_Y_DRENAJE: "Agua potable y drenaje",
  LIMPIA_Y_RECOLECCION: "Limpia y recolección",
  PARQUES_Y_JARDINES: "Parques y jardines",
  SERVICIOS_GENERALES: "Servicios generales",
};

export const ETIQUETA_DE_MOTIVO_DE_RECHAZO: Record<MotivoDeRechazo, string> = {
  DUPLICADO: "Duplicado",
  FUERA_DE_COMPETENCIA: "Fuera de competencia",
  INFORMACION_INSUFICIENTE: "Información insuficiente",
};

export const ETIQUETA_DE_TIPO_DE_INCIDENCIA: Record<TipoDeIncidencia, string> =
  {
    BACHE: "Bache",
    ALUMBRADO: "Alumbrado",
    FUGA: "Fuga",
    BASURA: "Basura",
    PARQUE: "Parque",
    OTRO: "Otro",
  };

/** El area de un reporte todavia sin asignar, igual para todos los roles. */
export const SIN_AREA = "Sin asignar";
