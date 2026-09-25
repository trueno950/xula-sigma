import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import {
  crearCambiarEstadoDeIntervencion,
  crearCorregirIntervencion,
  crearIntervencionConReferencias,
  crearIntervencionPorId,
  crearListarIntervencionesParaMapa,
  crearRegistrarIntervencion,
} from "./application";
import {
  crearLectorDeReferenciasPorModulos,
  crearLectorDeReportesPorReportes,
  crearLectorDeUbicacionesPorTerritorio,
  lectorDeIntervencionesDeMapaSql,
  repositorioDeIntervencionesSql,
} from "./infrastructure";

export const registrarIntervencion = crearRegistrarIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportes: crearLectorDeReportesPorReportes,
});

export const intervencionPorId = crearIntervencionPorId(
  repositorioDeIntervencionesSql,
);
export const intervencionConReferencias = crearIntervencionConReferencias(
  intervencionPorId,
  crearLectorDeReferenciasPorModulos(),
);
export const listarIntervencionesParaMapa = crearListarIntervencionesParaMapa(
  lectorDeIntervencionesDeMapaSql,
);
export const listarIntervencionesDeCalleEnTransaccion = (
  tx: TransaccionTenant,
  calleId: string,
) => repositorioDeIntervencionesSql.listarPorCalle(tx, calleId);

export const corregirIntervencion = crearCorregirIntervencion({
  repositorio: repositorioDeIntervencionesSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportes: crearLectorDeReportesPorReportes,
});

export const cambiarEstadoDeIntervencion = crearCambiarEstadoDeIntervencion({
  repositorio: repositorioDeIntervencionesSql,
});
