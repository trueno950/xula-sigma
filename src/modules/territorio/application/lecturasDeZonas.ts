import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  type LugarId,
  puedeTenerCatalogoDeCalles,
  type ZonaId,
} from "../domain";
import type { RepositorioDeLugares } from "./puertos";
import type { RepositorioDeLecturaDeZonas } from "./puertosDeLecturaDeZonas";

const exigirZona = async (
  repositorio: RepositorioDeLecturaDeZonas,
  tx: TransaccionTenant,
  id: ZonaId,
) => {
  const zona = await repositorio.buscarPorId(tx, id);
  if (!zona) throw new NoEncontradoError();
  return zona;
};

function crearListarZonas(
  repositorio: RepositorioDeLecturaDeZonas,
  lugares: Pick<RepositorioDeLugares, "buscarPorId">,
) {
  return (raizId: LugarId | null, contexto: ContextoActual) =>
    withTenant(contexto.ayuntamientoId, async (tx) => {
      if (raizId) {
        const raiz = await lugares.buscarPorId(tx, raizId);
        if (!raiz || raiz.bajaEn || !puedeTenerCatalogoDeCalles(raiz.tipo))
          throw new NoEncontradoError();
      }
      return repositorio.listar(tx, raizId);
    });
}

function crearZonaPorId(repositorio: RepositorioDeLecturaDeZonas) {
  return (id: ZonaId, contexto: ContextoActual) =>
    withTenant(contexto.ayuntamientoId, (tx) =>
      exigirZona(repositorio, tx, id),
    );
}

function crearCallesDeZona(repositorio: RepositorioDeLecturaDeZonas) {
  return (id: ZonaId, contexto: ContextoActual) =>
    withTenant(contexto.ayuntamientoId, async (tx) => {
      await exigirZona(repositorio, tx, id);
      return repositorio.calles(tx, id);
    });
}

export function crearLecturasDeZonas(
  repositorio: RepositorioDeLecturaDeZonas,
  lugares: Pick<RepositorioDeLugares, "buscarPorId">,
) {
  return {
    listarZonas: crearListarZonas(repositorio, lugares),
    zonaPorId: crearZonaPorId(repositorio),
    callesDeZona: crearCallesDeZona(repositorio),
  };
}
