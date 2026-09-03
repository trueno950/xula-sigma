import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { TipoDeIncidencia } from "../domain";
import type { ReporteSimilar, RepositorioDeReportes } from "./puertos";

/** Lo que el operador ya eligio antes de guardar (design.md seccion 13). */
export type CriterioDeSimilares = {
  lugarId: string;
  tipo: TipoDeIncidencia;
};

/**
 * Buscador informativo del alta (decision 15 de `proposal.md`). Sin guarda
 * de rol, mismo criterio que `listarReportes`: leer no es escribir. **No
 * tiene ninguna rama de rechazo**: no participa del alta, asi que no hay
 * forma de que la bloquee -es la decision 15 hecha estructura, no
 * disciplina.
 */
export function crearBuscarReportesSimilares(
  repositorio: Pick<RepositorioDeReportes, "similaresAbiertos">,
) {
  return function buscarReportesSimilares(
    criterio: CriterioDeSimilares,
    contexto: ContextoActual,
  ): Promise<readonly ReporteSimilar[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.similaresAbiertos(tx, criterio),
    );
  };
}
