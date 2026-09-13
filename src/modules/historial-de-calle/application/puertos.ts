import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type {
  CalleId,
  CalleParaHistorial,
  IntervencionParaHistorial,
  ReporteParaHistorial,
} from "../domain";

export type {
  CalleParaHistorial,
  EventoEstructuralParaHistorial,
  IntervencionParaHistorial,
  ReporteParaHistorial,
} from "../domain";

export type FuentesDeHistorial = {
  callePorId(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<CalleParaHistorial | null>;
  reportesPorCalle(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<readonly ReporteParaHistorial[]>;
  intervencionesPorCalle(
    tx: TransaccionTenant,
    calleId: CalleId,
  ): Promise<readonly IntervencionParaHistorial[]>;
};
