import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

/**
 * Baja logica, sin motivo estructurado (proposal.md, ronda de preguntas
 * #5): un motivo abierto sobre por que se dio de baja a una persona es
 * dato sensible sin proteccion, y la categoria cerrada no se inventa sin
 * el municipio piloto. La firma no acepta ese campo a proposito.
 */
export function crearDarDeBajaPersona(repositorio: RepositorioDePersonas) {
  return async function darDeBajaPersona(
    id: PersonaId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      // Mismo motivo que `editarPersona`, incluido usar `existente.id` y
      // no `id` crudo cuando `id` resulta ser un perdedor de fusion.
      const existente = await repositorio.buscarPorId(tx, id);
      if (!existente) throw new NoEncontradoError();

      await repositorio.marcarBaja(tx, existente.id, new Date());

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "BAJA_PERSONA",
        entidad: "personas",
        entidadId: existente.id,
      });
    });
  };
}
