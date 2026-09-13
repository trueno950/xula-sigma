import type { PorcionExportable } from "@/shared/exportacion/exportar";
import {
  crearAsignarAreaDeReporte,
  crearBuscarReportes,
  crearBuscarReportesSimilares,
  crearCambiarEstadoDeReporte,
  crearConsultarFolioDeReporte,
  crearHistorialDeReporte,
  crearListarReportes,
  crearListarReportesParaMapa,
  crearRegistrarReporte,
  crearReportePorId,
} from "./application";
import {
  contadorDeFoliosSql,
  crearLectorDeReportantesPorPadron,
  crearLectorDeUbicacionesPorTerritorio,
  lectorDeReportesDeMapaSql,
  registroDeMovimientosSql,
  repositorioDeReportesSql,
} from "./infrastructure";
import { movimientosDeReportes, reportes } from "./infrastructure/esquema";

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
export const listarReportesParaMapa = crearListarReportesParaMapa(
  lectorDeReportesDeMapaSql,
);
export const buscarReportes = crearBuscarReportes(repositorioDeReportesSql);
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
export const buscarReportesSimilares = crearBuscarReportesSimilares(
  repositorioDeReportesSql,
);
export const historialDeReporte = crearHistorialDeReporte(
  registroDeMovimientosSql,
);

/**
 * Porcion que `reportes` aporta al exportador de plataforma (design.md
 * seccion 17, rebanada 8). Se construye aca -no en `infrastructure`- mismo
 * criterio que `porcionDePadron`, `porcionesDeTerritorio` y
 * `porcionesDeConstancias`.
 *
 * Columnas explicitas, nunca `select()` pelado. Sin `ayuntamientoId`
 * -redundante, mismo criterio que las otras porciones-. `descripcion` y
 * `referencia` van incluidas: el archivo municipal tiene que poder
 * reconstruir que se reporto, el mismo argumento con el que `constancias`
 * incluye `codigoVerificacion`, y la exportacion ya sale detras de
 * `puedeExportar` con traza en bitacora.
 */
export const porcionesDeReportes: readonly [
  PorcionExportable,
  PorcionExportable,
] = [
  {
    nombre: "reportes",
    leer: (tx) =>
      tx
        .select({
          id: reportes.id,
          folio: reportes.folio,
          anio: reportes.anio,
          consecutivo: reportes.consecutivo,
          tipo: reportes.tipo,
          estado: reportes.estado,
          areaResponsable: reportes.areaResponsable,
          lugarId: reportes.lugarId,
          calleId: reportes.calleId,
          referencia: reportes.referencia,
          descripcion: reportes.descripcion,
          personaId: reportes.personaId,
          motivoDeRechazo: reportes.motivoDeRechazo,
          duplicadoDeReporteId: reportes.duplicadoDeReporteId,
          registradoPorUsuarioId: reportes.registradoPorUsuarioId,
          registradoEn: reportes.registradoEn,
          actualizadoEn: reportes.actualizadoEn,
        })
        .from(reportes),
  },
  {
    nombre: "movimientos_de_reportes",
    leer: (tx) =>
      tx
        .select({
          id: movimientosDeReportes.id,
          reporteId: movimientosDeReportes.reporteId,
          usuarioId: movimientosDeReportes.usuarioId,
          estadoAnterior: movimientosDeReportes.estadoAnterior,
          estadoNuevo: movimientosDeReportes.estadoNuevo,
          areaAsignada: movimientosDeReportes.areaAsignada,
          motivo: movimientosDeReportes.motivo,
          ocurridoEn: movimientosDeReportes.ocurridoEn,
        })
        .from(movimientosDeReportes),
  },
];
