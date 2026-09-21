import { asc, inArray } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, LugarId } from "./domain";
import { domicilios, lugares } from "./infrastructure/esquema";

export const leerRestauracion = (opciones: {
  ayuntamientoId: AyuntamientoId;
  lugarIds: LugarId[];
  domicilioIds: DomicilioId[];
}) =>
  withTenant(opciones.ayuntamientoId, async (tx) => ({
    lugares: await tx
      .select({
        id: lugares.id,
        tipo: lugares.tipo,
        nombre: lugares.nombre,
        padreId: lugares.padreId,
        bajaEn: lugares.bajaEn,
      })
      .from(lugares)
      .where(inArray(lugares.id, opciones.lugarIds))
      .orderBy(asc(lugares.id)),
    domicilios: await tx
      .select({ id: domicilios.id, lugarId: domicilios.lugarId })
      .from(domicilios)
      .where(inArray(domicilios.id, opciones.domicilioIds))
      .orderBy(asc(domicilios.id)),
  }));
