import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { ZonaId } from "../domain";
import type { DomicilioDelRegistro } from "./puertosDeDomicilios";

export type RepositorioDeCallesDeZonas = {
  domiciliosDeZona(
    tx: TransaccionTenant,
    zonaId: ZonaId,
  ): Promise<readonly DomicilioDelRegistro[]>;
};
