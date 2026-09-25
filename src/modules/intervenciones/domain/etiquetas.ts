import type { EstadoDeIntervencion } from "./estado";
import type { TipoDeIntervencion } from "./tipoDeIntervencion";

/**
 * Como se lee cada catalogo cerrado de `intervenciones` ante una persona:
 * un `Record<Union, string>` por catalogo, para que un miembro nuevo sin
 * etiqueta no compile. Los codigos siguen siendo lo que se guarda y lo que
 * viaja en los formularios y la URL.
 */
export const ETIQUETA_DE_ESTADO_DE_INTERVENCION: Record<
  EstadoDeIntervencion,
  string
> = {
  PLANIFICADA: "Planificada",
  EN_EJECUCION: "En ejecución",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export const ETIQUETA_DE_TIPO_DE_INTERVENCION: Record<
  TipoDeIntervencion,
  string
> = {
  OBRA: "Obra",
  REPAVIMENTACION: "Repavimentación",
  MEJORA: "Mejora",
  FUGA: "Fuga",
  ALUMBRADO: "Alumbrado",
  BACHE: "Bache",
  MANTENIMIENTO: "Mantenimiento",
};
