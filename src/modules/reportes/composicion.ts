import {
  crearAsignarAreaDeReporte,
  crearCambiarEstadoDeReporte,
  crearConsultarFolioDeReporte,
  crearListarReportes,
  crearRegistrarReporte,
  crearReportePorId,
} from "./application";
import {
  contadorDeFoliosSql,
  crearLectorDeReportantesPorPadron,
  crearLectorDeUbicacionesPorTerritorio,
  registroDeMovimientosSql,
  repositorioDeReportesSql,
} from "./infrastructure";

/**
 * Raiz de composicion del modulo: une la fabrica de cada caso de uso con
 * los adaptadores reales. Vive fuera de las cuatro capas y es el unico
 * archivo del modulo que ninguna regla de `.dependency-cruiser.cjs` vigila
 * (design.md seccion 1, precedente `constancias/composicion.ts`) — la
 * contencion es que no tenga nada que vigilar: solo cableado, cero
 * condicionales, cero `await`.
 *
 * No importa `./ui` ni `./index`: cualquiera de los dos cierra un ciclo
 * (`sin-ciclos`).
 */
export const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
});
export const reportePorId = crearReportePorId(repositorioDeReportesSql);
export const listarReportes = crearListarReportes(repositorioDeReportesSql);
export const cambiarEstadoDeReporte = crearCambiarEstadoDeReporte({
  repositorio: repositorioDeReportesSql,
  movimientos: registroDeMovimientosSql,
});
export const asignarAreaDeReporte = crearAsignarAreaDeReporte({
  repositorio: repositorioDeReportesSql,
  movimientos: registroDeMovimientosSql,
});
export const consultarFolioDeReporte = crearConsultarFolioDeReporte(
  repositorioDeReportesSql,
);
