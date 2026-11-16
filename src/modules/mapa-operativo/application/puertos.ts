import type { ContextoActual } from "@/shared/auth/contexto";
import type { PuntoDeMapa } from "../domain";

export type CalleParaMapaOperativo = {
  id: string;
  nombre: string;
  /** El lugar donde la calle cuelga hoy: define a que territorio pertenece un hecho. */
  lugarId: string;
  punto: PuntoDeMapa | null;
};
export type ReporteParaMapaOperativo = {
  id: string;
  folio: string;
  tipo: string;
  estado: string;
  areaResponsable: string | null;
  calleId: string | null;
  lugarId: string;
};
export type IntervencionParaMapaOperativo = {
  id: string;
  tipo: string;
  estado: string;
  calleId: string | null;
  lugarId: string;
};

/** Una opcion del selector de territorio: la cabecera o una comisaria. */
export type TerritorioParaMapaOperativo = { id: string; nombre: string };

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
  territoriosParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly TerritorioParaMapaOperativo[]>;
  /** El lugar y todos sus descendientes, a cualquier profundidad. */
  lugaresDelSubarbol(
    contexto: ContextoActual,
    lugarId: string,
  ): Promise<readonly string[]>;
};
export type FiltrosDeMapa = {
  tipo?: string | undefined;
  estado?: string | undefined;
  area?: string | undefined;
  /** El `?lugar=`: la raiz elegida; `undefined` es «todo el municipio». */
  lugar?: string | undefined;
};
