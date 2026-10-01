import type { EstadoDeConstancia } from "./estadoDeConstancia";
import type { MotivoDeCancelacion, MotivoDeReimpresion } from "./motivos";

/**
 * Como se lee cada catalogo cerrado de `constancias` ante una persona: un
 * `Record<Union, string>` por catalogo, para que un miembro nuevo sin
 * etiqueta no compile. Los codigos siguen siendo lo que se guarda y lo que
 * viaja en los formularios y la URL.
 */
export const ETIQUETA_DE_ESTADO_DE_CONSTANCIA: Record<
  EstadoDeConstancia,
  string
> = {
  VIGENTE: "Vigente",
  CANCELADA: "Cancelada",
};

export const ETIQUETA_DE_MOTIVO_DE_CANCELACION: Record<
  MotivoDeCancelacion,
  string
> = {
  ERROR_DE_CAPTURA: "Error de captura",
  DATOS_INCORRECTOS: "Datos incorrectos",
  SOLICITUD_DEL_INTERESADO: "Solicitud del interesado",
};

export const ETIQUETA_DE_MOTIVO_DE_REIMPRESION: Record<
  MotivoDeReimpresion,
  string
> = {
  EXTRAVIO: "Extravío",
  DETERIORO: "Deterioro",
  EJEMPLAR_ADICIONAL: "Ejemplar adicional",
};
