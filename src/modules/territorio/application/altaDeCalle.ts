import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { type CalleId, comoCalleId, type LugarId } from "../domain";
import type { RepositorioDeCalles } from "./puertos";

export type NuevaCalle = {
  nombre: string;
  lugarId: LugarId;
};

/**
 * Alta de una calle en el catalogo de un lugar. `puedeAdministrarTerritorio`
 * (tasks.md 4.2): el catalogo de calles es estructura territorial, no
 * trabajo de mostrador. `calles_tenant_lugar_nombre_idx` permite el mismo
 * nombre en dos lugares distintos -"Calle 21" de la cabecera y de una
 * comisaria conviven-, asi que no hay chequeo propio de duplicado aca; el
 * choque es cosa de `renombrarCalle` (design.md seccion 9).
 */
export function crearAltaDeCalle(repositorio: RepositorioDeCalles) {
  return async function altaDeCalle(
    datos: NuevaCalle,
    contexto: ContextoActual,
  ): Promise<{ id: CalleId }> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const id = comoCalleId(randomUUID());

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      await repositorio.crear(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        nombre: datos.nombre,
        lugarId: datos.lugarId,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ALTA_CALLE",
        entidad: "calles",
        entidadId: id,
      });
    });

    return { id };
  };
}
