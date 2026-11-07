import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  CalleConDomiciliosError,
  CalleEnZonaError,
  type CalleId,
} from "../domain";
import type { RepositorioDeCalles } from "./puertos";

export function crearDarDeBajaCalle(repositorio: RepositorioDeCalles) {
  return async function darDeBajaCalle(
    id: CalleId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente || existente.bajaEn !== null) {
        throw new NoEncontradoError();
      }

      const domicilios = await repositorio.contarDomiciliosQueLaUsan(tx, id);
      if (domicilios > 0) throw new CalleConDomiciliosError();

      // La zona seguiria nombrando a una calle que ya no existe. Las zonas
      // dadas de baja no cuentan: ya no se leen y no se puede quitar la
      // calle de ellas.
      const zonasActivas = await repositorio.contarZonasActivasQueLaUsan(
        tx,
        id,
      );
      if (zonasActivas > 0) {
        throw new CalleEnZonaError(
          "Esta calle pertenece a una zona operativa. Quítela de la zona antes de darla de baja.",
        );
      }

      const actualizada = await repositorio.actualizar(tx, {
        id,
        nombre: existente.nombre,
        lugarId: existente.lugarId,
        punto: existente.punto,
        bajaEn: new Date(),
      });
      if (!actualizada) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "BAJA_CALLE",
        entidad: "calles",
        entidadId: id,
      });
    });
  };
}
