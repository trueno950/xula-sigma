import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  AreaResponsable,
  EstadoDeReporte,
  ReporteId,
  TipoDeIncidencia,
} from "../domain";

/**
 * Lo que el mapa operativo necesita de un reporte: identidad, clasificacion,
 * estado, ubicacion y fecha de registro. Sin `descripcion` ni `referencia`
 * -siguen protegidas en el detalle del reporte-, y `calleId` nulo es una
 * fila valida: el mapa la declara como cobertura faltante, no la descarta.
 *
 * `registradoEn` lo pide la senal de atraso de S1 de `gestion-municipal`: el
 * mapa tiene que decir que un reporte lleva N dias sin atenderse, y esa
 * cuenta sale de la fecha de registro. Es el mismo dato que la bandeja
 * (ya lo expone, con `ReporteGuardado`). El mapa lo traduce a fecha civil en
 * su propio adaptador, con `shared/lib/fecha`; aca viaja el instante.
 */
export type ReporteParaMapa = {
  id: ReporteId;
  folio: string;
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  areaResponsable: AreaResponsable | null;
  calleId: string | null;
  lugarId: string;
  registradoEn: Date;
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
