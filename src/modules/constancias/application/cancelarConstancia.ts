import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ConstanciaId, MotivoDeCancelacion } from "../domain";
import type { RepositorioDeConstancias } from "./puertos";

/**
 * `cancelarConstancia`: se autoriza por `puedeAdministrarDocumentos`, no por
 * `puedeEscribir` -decision 8 de design.md: haber emitido el documento no da
 * derecho a cancelarlo, solo el `ADMIN_MUNICIPAL` puede-.
 *
 * El `UPDATE ... WHERE cancelada_en IS NULL RETURNING id` de
 * `repositorio.cancelar` es tambien el mecanismo de concurrencia (design.md
 * seccion 10): sin fila afectada cubre por igual un id inexistente, uno de
 * otro tenant y una constancia ya cancelada -incluida la carrera de dos
 * cancelaciones simultaneas, que se serializan sobre la fila y la segunda
 * ve cero filas-. Ninguno de los tres casos necesita una rama propia.
 */
export function crearCancelarConstancia(repositorio: RepositorioDeConstancias) {
  return async function cancelarConstancia(
    id: ConstanciaId,
    motivo: MotivoDeCancelacion,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarDocumentos(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const afecto = await repositorio.cancelar(tx, {
        id,
        motivo,
        usuarioId: contexto.usuario.id,
      });
      if (!afecto) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "CANCELAR_CONSTANCIA",
        entidad: "constancias",
        entidadId: id,
      });
    });
  };
}
