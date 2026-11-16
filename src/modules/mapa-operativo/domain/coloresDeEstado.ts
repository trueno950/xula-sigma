/**
 * Un color por estado, decidido aca -en el servidor- y enviado como dato:
 * el cliente no elige colores de estado (antipatron 13 de `AGENTS.md` es el
 * mismo criterio aplicado a la marca). Con dos estados del mismo recurso no
 * se puede repetir color, porque el pin es lo unico que distingue uno de
 * otro a primera vista; entre recursos si se repite, y la leyenda los separa
 * por su etiqueta.
 */
const COLOR_DE_ESTADO: Readonly<Record<string, string>> = {
  RECIBIDO: "#b45309",
  EN_ATENCION: "#1d4ed8",
  RESUELTO: "#15803d",
  RECHAZADO: "#6b7280",
  PLANIFICADA: "#7c3aed",
  EN_EJECUCION: "#0e7490",
  FINALIZADA: "#15803d",
  CANCELADA: "#6b7280",
};

/** Un estado que el mapa no conoce no hereda el color de otro. */
export const COLOR_DE_ESTADO_DESCONOCIDO = "#4b5563";

export const colorDeEstado = (estado: string): string =>
  COLOR_DE_ESTADO[estado] ?? COLOR_DE_ESTADO_DESCONOCIDO;
