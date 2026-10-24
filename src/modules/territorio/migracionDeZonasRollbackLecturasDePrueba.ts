import { asc, inArray, sql } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenantAnterior } from "./conexionAnteriorAlCorteDePrueba";
import type { DomicilioId, LugarId } from "./domain";
import { domicilios, lugares } from "./infrastructure/esquema";

export const leerRestauracion = (opciones: {
  ayuntamientoId: AyuntamientoId;
  lugarIds: LugarId[];
  domicilioIds: DomicilioId[];
}) =>
  withTenantAnterior(opciones.ayuntamientoId, async (tx) => ({
    lugares: await tx
      .select({
        id: lugares.id,
        // El `tipo` de esta base todavia puede ser `sector` o `manzana`, que
        // `TipoDeLugar` ya no admite: se lee como texto y se compara contra
        // la salida guardada, que trae el tipo real.
        tipo: sql<string>`${lugares.tipo}`,
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
