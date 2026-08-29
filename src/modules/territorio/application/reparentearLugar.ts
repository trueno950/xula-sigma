import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { JerarquiaInvalidaError, type LugarId, puedeContener } from "../domain";
import type { RepositorioDeLugares } from "./puertos";

/**
 * Mueve un lugar a otro padre. `puedeAdministrarTerritorio`, no
 * `puedeEscribir` (criterio en `shared/auth/roles.ts`). `nuevoPadreId = null`
 * saltea el chequeo de tipo — cualquier tipo puede volverse raiz (design.md
 * seccion 9, raggedness), y solo los de rango 0 pueden serlo de verdad.
 */
export function crearReparentearLugar(repositorio: RepositorioDeLugares) {
  return async function reparentearLugar(
    lugarId: LugarId,
    nuevoPadreId: LugarId | null,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const lugar = await repositorio.buscarPorId(tx, lugarId);
      if (!lugar) throw new NoEncontradoError();

      if (nuevoPadreId !== null) {
        const nuevoPadre = await repositorio.buscarPorId(tx, nuevoPadreId);
        if (!nuevoPadre) throw new NoEncontradoError();
        if (!puedeContener(nuevoPadre.tipo, lugar.tipo)) {
          throw new JerarquiaInvalidaError();
        }
      }

      await repositorio.actualizar(tx, {
        id: lugar.id,
        nombre: lugar.nombre,
        padreId: nuevoPadreId,
        bajaEn: lugar.bajaEn,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REPARENTEAR_LUGAR",
        entidad: "lugares",
        entidadId: lugar.id,
      });
    });
  };
}
