import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
  ResidenciaGuardada,
} from "./puertos";

/**
 * Sin guarda de rol: leer el historial no es escribirlo, mismo criterio
 * que `listarCalles`/`personaPorId`. `identidadesDe` trae todos los ids
 * que colapsan en `personaId` -uno si nunca se fusiono, dos o mas si si-
 * asi que `historialDe` los cita todos en una sola consulta (design.md
 * seccion 8, "El camino de lectura del colapso"). La "residencia vigente"
 * la elige quien consume el resultado -primera fila con `hastaEn` null en
 * el orden `desdeEn DESC, creadoEn DESC` que ya trae `historialDe`-, nunca
 * este caso de uso: no hay escritura que reconciliar.
 */
export function crearHistorialDeResidencias(
  repositorio: RepositorioDeResidencias,
  crearLecturaDePersonas: (contexto: ContextoActual) => LecturaDePersonas,
) {
  return async function historialDeResidencias(
    personaId: string,
    contexto: ContextoActual,
  ): Promise<readonly ResidenciaGuardada[]> {
    const lecturaDePersonas = crearLecturaDePersonas(contexto);
    const identidades = await lecturaDePersonas.identidadesDe(personaId);
    if (identidades.length === 0) throw new NoEncontradoError();

    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.historialDe(tx, identidades),
    );
  };
}
