import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type ConstanciaId,
  DocumentoCanceladoError,
  type MotivoDeReimpresion,
  type ReimpresionId,
} from "../domain";
import type { RepositorioDeConstancias } from "./puertos";

/**
 * `reimprimirConstancia`: mismo esqueleto que `emitirConstancia` -guarda de
 * rol fuera de la transaccion, todo lo demas adentro de un `withTenant`
 * (design.md de `constancias-oficios`, seccion 10). Se autoriza por
 * `puedeEscribir`, no por `puedeAdministrarDocumentos`: un `OPERADOR` emite y
 * reimprime sin necesitar la regla de administracion, que queda reservada
 * para cancelar (`cancelarConstancia.ts`).
 */
export function crearReimprimirConstancia(
  repositorio: RepositorioDeConstancias,
) {
  return async function reimprimirConstancia(
    id: ConstanciaId,
    motivo: MotivoDeReimpresion,
    contexto: ContextoActual,
  ): Promise<ReimpresionId> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      // `bloquearPorId`, no `buscarPorId`: el lock cierra la carrera con
      // `cancelarConstancia` (ver el comentario del puerto en `puertos.ts`).
      const constancia = await repositorio.bloquearPorId(tx, id);
      if (!constancia) throw new NoEncontradoError();
      if (constancia.canceladaEn !== null) {
        throw new DocumentoCanceladoError();
      }

      const reimpresionId = await repositorio.registrarReimpresion(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        constanciaId: id,
        usuarioId: contexto.usuario.id,
        motivo,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REIMPRIMIR_CONSTANCIA",
        entidad: "constancias",
        entidadId: id,
      });

      return reimpresionId;
    });
  };
}
