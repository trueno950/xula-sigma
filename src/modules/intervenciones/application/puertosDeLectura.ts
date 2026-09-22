import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  EstadoDeIntervencion,
  IntervencionId,
  TipoDeIntervencion,
} from "../domain";

export type LecturaDeUbicaciones = {
  de(
    tx: TransaccionTenant,
    lugarId: string,
    calleId: string | null,
  ): Promise<{ texto: string } | null>;
};

export type LecturaDeReportes = {
  porId(tx: TransaccionTenant, reporteId: string): Promise<boolean>;
};

export type IntervencionParaMapa = {
  id: IntervencionId;
  tipo: TipoDeIntervencion;
  estado: EstadoDeIntervencion;
  calleId: string | null;
  lugarId: string;
};

export type LectorDeIntervencionesDeMapa = {
  listarParaMapa(
    tx: TransaccionTenant,
  ): Promise<readonly IntervencionParaMapa[]>;
};
