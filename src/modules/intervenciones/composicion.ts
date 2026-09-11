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

export const corregirIntervencion = crearCorregirIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
});

export const cambiarEstadoDeIntervencion = crearCambiarEstadoDeIntervencion({
  repositorio: repositorioDeIntervencionesSql,
});
