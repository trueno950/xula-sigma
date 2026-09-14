import { eq } from "drizzle-orm";
import { bitacora } from "@/shared/tenancy/esquema";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { IntervencionId } from "./domain";
import { repositorioDeIntervencionesSql } from "./infrastructure";

export const intervencionDe = (lugarId: string, descripcion: string) => ({
  tipo: "OBRA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId,
  calleId: null,
  reporteId: null,
  descripcion,
});

export const intervencionPorId = (
  ayuntamientoId: typeof motul,
  id: IntervencionId,
) =>
  withTenant(ayuntamientoId, (tx) =>
    repositorioDeIntervencionesSql.buscarPorId(tx, id),
  );

export const trazasDeCorreccion = () =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "CORREGIR_INTERVENCION")),
  );
