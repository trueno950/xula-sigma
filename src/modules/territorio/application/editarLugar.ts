import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DatosDeEdicionDeLugar, RepositorioDeLugares } from "./puertos";

/**
 * Renombra un lugar, y nada mas (`DatosDeEdicionDeLugar` en `puertos.ts`
 * explica por que no tiene `tipo`). `puedeEscribir`, no
 * `puedeAdministrarTerritorio` (criterio en `shared/auth/roles.ts`).
 */
export function crearEditarLugar(repositorio: RepositorioDeLugares) {
  return async function editarLugar(
    datos: DatosDeEdicionDeLugar,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.buscarPorId(tx, datos.id);
      if (!existente) throw new NoEncontradoError();

      await repositorio.actualizar(tx, {
        id: existente.id,
        nombre: datos.nombre,
        padreId: existente.padreId,
        bajaEn: existente.bajaEn,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "EDITAR_LUGAR",
        entidad: "lugares",
        entidadId: existente.id,
      });
    });
  };
}
