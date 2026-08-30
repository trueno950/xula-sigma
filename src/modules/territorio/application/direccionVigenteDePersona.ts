import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, ResidenciaId } from "../domain";
import { componerDireccion, vigenteDe } from "../domain";
import type { LectorDeDirecciones } from "./puertosDeDirecciones";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
} from "./puertosDeResidencias";

export type DireccionVigente = {
  residenciaId: ResidenciaId;
  domicilioId: DomicilioId;
  desdeEn: string;
  texto: string;
};

/**
 * Una sola pregunta, un solo caso de uso (design.md seccion 7): "cual es la
 * direccion vigente de esta persona, como texto". `identidadesDe` corre
 * **fuera** de `withTenant`, nunca adentro -con `DB_POOL_MAX=1` un
 * `withTenant` anidado se traba, y en produccion consume dos conexiones del
 * pool por operacion (capa-territorial seccion 6, heredado sin reabrir)-.
 *
 * Devuelve `null` y no lanza, mismo criterio que `personaPorId`: quien
 * decide que eso es `SinResidenciaVigenteError` es `constancias`, no
 * `territorio`. `partesDe` devolviendo `null` significa que el domicilio no
 * existe o RLS lo esconde; para el llamador es lo mismo.
 */
export function crearDireccionVigenteDePersona(
  repositorio: RepositorioDeResidencias,
  lectorDeDirecciones: LectorDeDirecciones,
  crearLecturaDePersonas: (contexto: ContextoActual) => LecturaDePersonas,
) {
  return async function direccionVigenteDePersona(
    personaId: string,
    contexto: ContextoActual,
  ): Promise<DireccionVigente | null> {
    const lecturaDePersonas = crearLecturaDePersonas(contexto);
    const identidades = await lecturaDePersonas.identidadesDe(personaId);
    if (identidades.length === 0) return null;

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const historial = await repositorio.historialDe(tx, identidades);
      const vigente = vigenteDe(historial);
      if (!vigente) return null;

      const partes = await lectorDeDirecciones.partesDe(
        tx,
        vigente.domicilioId,
      );
      if (!partes) return null;

      return {
        residenciaId: vigente.id,
        domicilioId: vigente.domicilioId,
        desdeEn: vigente.desdeEn,
        texto: componerDireccion(partes),
      };
    });
  };
}
