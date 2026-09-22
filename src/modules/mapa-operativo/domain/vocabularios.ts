/**
 * Copia local de los vocabularios cerrados de tipo/estado de `reportes` e
 * `intervenciones`, nunca importados: traerlos por el barrel del modulo
 * ajeno -aunque sea `import type`- es el antipatron 8 de `AGENTS.md`
 * (hallazgo de GGA en esta misma revision). El mapa solo necesita saber
 * si un valor de filtro pertenece al vocabulario de un recurso; esta lista
 * es esa frontera. Si `reportes` o `intervenciones` agregan un valor
 * nuevo, esta copia queda desactualizada hasta que alguien la sincronice a
 * mano; el efecto de quedarse atras es benigno -el filtro trata el valor
 * nuevo como "no le pertenece" y deja pasar el recurso sin filtrar, nunca
 * lo excluye por error-.
 *
 * `tipo` no es disjunto entre los dos recursos -comparten BACHE, ALUMBRADO
 * y FUGA-: para esos tres valores el filtro de tipo aplica a reportes e
 * intervenciones a la vez. `estado` si es disjunto.
 */
export const TIPOS_DE_REPORTE_PARA_FILTRO = [
  "BACHE",
  "ALUMBRADO",
  "FUGA",
  "BASURA",
  "PARQUE",
  "OTRO",
] as const;

export const TIPOS_DE_INTERVENCION_PARA_FILTRO = [
  "OBRA",
  "REPAVIMENTACION",
  "MEJORA",
  "FUGA",
  "ALUMBRADO",
  "BACHE",
  "MANTENIMIENTO",
] as const;

export const ESTADOS_DE_REPORTE_PARA_FILTRO = [
  "RECIBIDO",
  "EN_ATENCION",
  "RESUELTO",
  "RECHAZADO",
] as const;

export const ESTADOS_DE_INTERVENCION_PARA_FILTRO = [
  "PLANIFICADA",
  "EN_EJECUCION",
  "FINALIZADA",
  "CANCELADA",
] as const;
