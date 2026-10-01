import type {
  AREAS_PARA_FILTRO,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "./vocabularios";

type Miembro =
  | (typeof TIPOS_DE_REPORTE_PARA_FILTRO)[number]
  | (typeof TIPOS_DE_INTERVENCION_PARA_FILTRO)[number]
  | (typeof ESTADOS_DE_REPORTE_PARA_FILTRO)[number]
  | (typeof ESTADOS_DE_INTERVENCION_PARA_FILTRO)[number]
  | (typeof AREAS_PARA_FILTRO)[number];

/**
 * Como se lee cada valor del vocabulario local del mapa. Es una copia de las
 * etiquetas de `reportes` e `intervenciones`, igual que `vocabularios.ts` lo
 * es de sus catalogos -un modulo no importa el dominio de otro-;
 * `infrastructure/vocabulariosSincronizados.test.ts` la compara con sus
 * duenos. `Record<Miembro, string>`: un valor nuevo del vocabulario sin
 * etiqueta no compila.
 */
export const ETIQUETA_DE_FILTRO: Record<Miembro, string> = {
  BACHE: "Bache",
  ALUMBRADO: "Alumbrado",
  FUGA: "Fuga",
  BASURA: "Basura",
  PARQUE: "Parque",
  OTRO: "Otro",
  OBRA: "Obra",
  REPAVIMENTACION: "Repavimentación",
  MEJORA: "Mejora",
  MANTENIMIENTO: "Mantenimiento",
  RECIBIDO: "Recibido",
  EN_ATENCION: "En atención",
  RESUELTO: "Resuelto",
  RECHAZADO: "Rechazado",
  PLANIFICADA: "Planificada",
  EN_EJECUCION: "En ejecución",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  OBRAS_PUBLICAS: "Obras públicas",
  ALUMBRADO_PUBLICO: "Alumbrado público",
  AGUA_POTABLE_Y_DRENAJE: "Agua potable y drenaje",
  LIMPIA_Y_RECOLECCION: "Limpia y recolección",
  PARQUES_Y_JARDINES: "Parques y jardines",
  SERVICIOS_GENERALES: "Servicios generales",
};

const ETIQUETAS: Readonly<Record<string, string>> = ETIQUETA_DE_FILTRO;

/**
 * Los valores llegan como `string` de los puertos, que no importan los
 * catalogos ajenos. Uno que este vocabulario todavia no conoce se muestra
 * tal cual: es mejor un codigo crudo que esconder el hecho.
 */
export const etiquetaDeFiltro = (valor: string): string =>
  ETIQUETAS[valor] ?? valor;
