import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { LugarConDependientesError, type LugarId } from "../domain";
import type { RepositorioDeLugares } from "./puertos";

/**
 * Baja logica de un lugar. Rechaza con `LugarConDependientesError`
 * (`domain/errores.ts` explica por que la regla vive aca y no en un FK)
 * si tiene hijos activos o domicilios colgados, con dos `SELECT count`.
 */
export function crearDarDeBajaLugar(repositorio: RepositorioDeLugares) {
  return async function darDeBajaLugar(
    id: LugarId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.buscarPorId(tx, id);
      if (!existente) throw new NoEncontradoError();

      const [hijosActivos, domiciliosColgados] = await Promise.all([
        repositorio.contarHijosActivos(tx, existente.id),
        repositorio.contarDomiciliosColgados(tx, existente.id),
      ]);
      if (hijosActivos > 0 || domiciliosColgados > 0) {
        throw new LugarConDependientesError();
      }

      await repositorio.actualizar(tx, {
        id: existente.id,
        nombre: existente.nombre,
        padreId: existente.padreId,
        bajaEn: new Date(),
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "BAJA_LUGAR",
        entidad: "lugares",
        entidadId: existente.id,
      });
    });
  };
}
