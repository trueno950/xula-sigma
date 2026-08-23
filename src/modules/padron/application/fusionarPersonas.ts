import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeFusionarPersonas } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

/**
 * Fusion no destructiva por redireccion (design.md decision 3). Los dos
 * ids que llegan pueden ya ser perdedores de una fusion anterior:
 * `buscarPorId` los resuelve al terminal antes de operar, que es "el
 * resolutor" del algoritmo, no un metodo aparte.
 */
export function crearFusionarPersonas(repositorio: RepositorioDePersonas) {
  return async function fusionarPersonas(
    perdedoraId: PersonaId,
    ganadoraId: PersonaId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeFusionarPersonas(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const perdedora = await repositorio.buscarPorId(tx, perdedoraId);
      if (!perdedora) throw new NoEncontradoError();

      const ganadora = await repositorio.buscarPorId(tx, ganadoraId);
      if (!ganadora) throw new NoEncontradoError();

      // Auto-fusion: los dos terminales ya coinciden (mismo ciclo de largo
      // 1 que documenta design.md). No hay nada que fusionar ni que trazar.
      if (perdedora.id === ganadora.id) return;

      await repositorio.fusionar(tx, perdedora.id, ganadora.id);

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "FUSIONAR_PERSONA",
        entidad: "personas",
        entidadId: perdedora.id,
      });
    });
  };
}
