import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ReporteId } from "./domain";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * El folio impreso de un reporte ya registrado: lo unico que el operador
 * ve y teclea para indicar el original de un duplicado, mientras que
 * `registrarReporte` devuelve su id.
 */
export const folioDe = async (
  ayuntamientoId: AyuntamientoId,
  id: ReporteId,
): Promise<string> => {
  const reporte = await withTenant(ayuntamientoId, (tx) =>
    repositorioDeReportesSql.buscarPorId(tx, id),
  );
  if (!reporte) throw new Error("El reporte de prueba no existe");

  return reporte.folio;
};
