/**
 * El tono de la insignia de estado de cada hecho (S4). Es una copia local del
 * criterio de `reportes` e `intervenciones` -un modulo no importa el dominio
 * de otro (`AGENTS.md`, antipatron 8)-, y el tipo es propio por la misma
 * razon: `domain` no importa nada, ni siquiera el de `shared/ui`.
 *
 * El tono acompaña a la palabra, nunca la reemplaza: el color solo no alcanza
 * para decir en que estado esta un hecho.
 */
export type TonoDeEstado = "neutro" | "exito" | "aviso" | "error";

const TONO_DE_ESTADO: Readonly<Record<string, TonoDeEstado>> = {
  RECIBIDO: "neutro",
  EN_ATENCION: "aviso",
  RESUELTO: "exito",
  RECHAZADO: "error",
  PLANIFICADA: "neutro",
  EN_EJECUCION: "aviso",
  FINALIZADA: "exito",
  CANCELADA: "error",
};

/** Un estado que el mapa no conoce no hereda el tono de otro. */
export const tonoDeEstado = (estado: string): TonoDeEstado =>
  TONO_DE_ESTADO[estado] ?? "neutro";
