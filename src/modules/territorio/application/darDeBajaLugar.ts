import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  LugarConCallesError,
  LugarConDependientesError,
  LugarConZonasError,
  type LugarId,
} from "../domain";
import type { RepositorioDeLugares } from "./puertos";

const exigirSinDependientes = async (
  repositorio: RepositorioDeLugares,
  tx: TransaccionTenant,
  id: LugarId,
): Promise<void> => {
  const [hijosActivos, domiciliosColgados, calles, zonas] = await Promise.all([
    repositorio.contarHijosActivos(tx, id),
    repositorio.contarDomiciliosColgados(tx, id),
    repositorio.contarCallesActivas(tx, id),
    repositorio.contarZonasActivas(tx, id),
  ]);
  if (hijosActivos > 0 || domiciliosColgados > 0) {
    throw new LugarConDependientesError();
  }
  if (calles > 0) throw new LugarConCallesError();
  if (zonas > 0) throw new LugarConZonasError();
};

/**
 * Baja logica de un lugar. Rechaza con `LugarConDependientesError` o una de
 * sus subclases (`domain/errores.ts` explica por que la regla vive aca y no
 * en un FK) si tiene hijos, domicilios, calles o zonas activas.
 *
 * Cuenta despues de bloquear la fila: un alta que cuelga algo de este lugar
 * tambien lo bloquea, asi que una de las dos espera a la otra y la que
 * llega segunda ve lo que la primera confirmo.
 */
export function crearDarDeBajaLugar(repositorio: RepositorioDeLugares) {
  return async function darDeBajaLugar(
    id: LugarId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente) throw new NoEncontradoError();

      await exigirSinDependientes(repositorio, tx, existente.id);

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
