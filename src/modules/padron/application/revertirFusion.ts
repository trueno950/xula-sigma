import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeFusionarPersonas } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

/**
 * Deshace una fusion directa (design.md decision 3, "Reversion"). Mismo
 * permiso que `fusionarPersonas`: revertir es igual de sensible que
 * fusionar, no una operacion de lectura.
 *
 * Sin verificacion previa de existencia via `buscarPorId`: ese puerto
 * resuelve la redireccion, asi que consultarlo por `id` devolveria al
 * ganador y ocultaria justo el estado que esta funcion necesita ver. En
 * cambio, `repositorio.revertirFusion` devuelve si la fila existia y era
 * de este tenant -RLS deja un `UPDATE` sobre una fila ajena en cero filas,
 * sin error-, asi que un `id` de otro municipio (o inexistente) da 404 en
 * vez de un exito fantasma con bitacora de una reversion que nunca paso.
 */
export function crearRevertirFusion(repositorio: RepositorioDePersonas) {
  return async function revertirFusion(
    id: PersonaId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeFusionarPersonas(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const revertida = await repositorio.revertirFusion(tx, id);
      if (!revertida) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REVERTIR_FUSION",
        entidad: "personas",
        entidadId: id,
      });
    });
  };
}
