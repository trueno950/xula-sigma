import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import {
  crearCambiarEstadoDeIntervencion,
  crearCorregirIntervencion,
  crearIntervencionPorId,
  crearRegistrarIntervencion,
} from "./application";
import {
  crearLectorDeUbicacionesPorTerritorio,
  repositorioDeIntervencionesSql,
} from "./infrastructure";

export const registrarIntervencion = crearRegistrarIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
});

export const intervencionPorId = crearIntervencionPorId(
  repositorioDeIntervencionesSql,
);
export const listarIntervencionesDeCalleEnTransaccion = (
  tx: TransaccionTenant,
  calleId: string,
) => repositorioDeIntervencionesSql.listarPorCalle(tx, calleId);

export const corregirIntervencion = crearCorregirIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
});

export const cambiarEstadoDeIntervencion = crearCambiarEstadoDeIntervencion({
  repositorio: repositorioDeIntervencionesSql,
});
