import type { ContextoActual } from "@/shared/auth/contexto";
import type { PuntoDeMapa } from "../domain";

export type CalleParaMapaOperativo = {
  id: string;
  nombre: string;
  punto: PuntoDeMapa | null;
};
export type ReporteParaMapaOperativo = {
  id: string;
  folio: string;
  tipo: string;
  estado: string;
  areaResponsable: string | null;
  calleId: string | null;
};
export type IntervencionParaMapaOperativo = {
  id: string;
  tipo: string;
  estado: string;
  calleId: string | null;
};
export type FuentesDeMapa = {
  callesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly CalleParaMapaOperativo[]>;
  reportesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly ReporteParaMapaOperativo[]>;
  intervencionesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly IntervencionParaMapaOperativo[]>;
};
export type FiltrosDeMapa = {
  tipo?: string | undefined;
  estado?: string | undefined;
  area?: string | undefined;
};
