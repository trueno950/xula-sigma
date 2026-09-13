import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { EstadoDeReporte, ReporteId, TipoDeIncidencia } from "../domain";

/**
 * Lo que el mapa operativo necesita de un reporte: identidad, clasificacion,
 * estado y ubicacion. Sin `descripcion` ni `referencia` -siguen protegidas
 * en el detalle del reporte-, y `calleId` nulo es una fila valida: el mapa
 * la declara como cobertura faltante, no la descarta.
 */
export type ReporteParaMapa = {
  id: ReporteId;
  folio: string;
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  calleId: string | null;
  lugarId: string;
};

/**
 * Lado de lectura de reportes para el mapa: sin guarda administrativa
 * -leer no es administrar-, con el tenant del contexto del servidor y RLS
 * cerrando el resto. Sin filtro de `calleId`: las filas sin calle entran.
 */
export type LectorDeReportesDeMapa = {
  listarParaMapa(tx: TransaccionTenant): Promise<readonly ReporteParaMapa[]>;
};

export type ReporteParaHistorial = {
  id: ReporteId;
  registradoEn: Date;
};

export type LectorDeReportesDeHistorial = {
  listarPorCalle(
    tx: TransaccionTenant,
    calleId: string,
  ): Promise<readonly ReporteParaHistorial[]>;
};
