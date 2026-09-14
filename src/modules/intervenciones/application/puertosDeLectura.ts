import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

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
