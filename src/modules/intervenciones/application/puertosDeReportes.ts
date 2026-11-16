import type { ContextoActual } from "@/shared/auth/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

/**
 * Lo que `intervenciones` necesita del reporte para programar obra sobre el,
 * con los estados como texto y no como el tipo del modulo ajeno: el puerto es
 * de este modulo y su adaptador (`infrastructure/reportesParaObraPorReportes`)
 * es el unico que habla con `reportes` (antipatron 8 de `AGENTS.md`).
 */
export type ReporteDeOrigen = {
  id: string;
  /** El codigo del estado del reporte: `programarObra` no lo interpreta. */
  estado: string;
  lugarId: string;
  calleId: string | null;
};

/** Los dos destinos que esta historia escribe sobre un reporte ligado. */
export type EstadoDeReporteParaObra = "EN_ATENCION" | "RESUELTO";

/**
 * Que paso al pedir la transicion. `CERRADO` y `AUSENTE` no son errores del
 * puerto sino hechos que el caso de uso traduce a su propio error de dominio:
 * un reporte cerrado se rechaza al programar y se deja quieto al finalizar, y
 * uno de otro municipio -o ya borrado- es un 404 (regla 8).
 *
 * `SIN_CAMBIOS` es el caso de un reporte que ya estaba en el destino: no se
 * reescribe ni deja un segundo movimiento.
 */
export type ResultadoDeTransicionDeReporte =
  | "MOVIDO"
  | "SIN_CAMBIOS"
  | "CERRADO"
  | "AUSENTE";

/**
 * Puerto propio del modulo hacia `reportes`. Las dos operaciones reciben el
 * `tx` de `withTenant` y no abren transaccion: la obra, el movimiento del
 * reporte y su traza confirman o fallan juntos (S2 y S3).
 */
export type ReportesParaObra = {
  de(tx: TransaccionTenant, reporteId: string): Promise<ReporteDeOrigen | null>;
  mover(
    tx: TransaccionTenant,
    datos: {
      reporteId: string;
      estadoNuevo: EstadoDeReporteParaObra;
      contexto: ContextoActual;
    },
  ): Promise<ResultadoDeTransicionDeReporte>;
};
