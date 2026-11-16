import type { PorcionExportable } from "@/shared/exportacion/exportar";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import {
  crearAsignarAreaDeReporte,
  crearBuscarReportes,
  crearBuscarReportesSimilares,
  crearCambiarEstadoDeReporte,
  crearCambiarUmbralDeAtraso,
  crearConsultarFolioDeReporte,
  crearHistorialDeReporte,
  crearLeerUmbralDeAtraso,
  crearListarReportes,
  crearListarReportesParaMapa,
  crearRegistrarReporte,
  crearReporteExisteEnTransaccion,
  crearReportePorId,
} from "./application";
import { crearBuscarDireccionesParaReporte } from "./application/buscarDireccionesParaReporte";
import { crearReporteParaIntervencion } from "./application/reporteParaIntervencion";
import {
  contadorDeFoliosSql,
  crearLectorDeReportantesPorPadron,
  crearLectorDeUbicacionesPorTerritorio,
  lectorDeReportesDeMapaSql,
  registroDeMovimientosSql,
  repositorioDeConfiguracionDeReportesSql,
  repositorioDeReportesSql,
} from "./infrastructure";
import { buscadorDeDireccionesPorTerritorio } from "./infrastructure/buscadorDeDireccionesPorTerritorio";
import {
  foliosDeReportes,
  movimientosDeReportes,
  reportes,
} from "./infrastructure/esquema";
import { crearLectorDeDomiciliosPorTerritorio } from "./infrastructure/lectorDeDomiciliosPorTerritorio";

export const buscarDireccionesParaReporte = crearBuscarDireccionesParaReporte(
  buscadorDeDireccionesPorTerritorio,
);

export const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
  crearLecturaDeDomicilios: crearLectorDeDomiciliosPorTerritorio,
});
export const reportePorId = crearReportePorId(repositorioDeReportesSql);
export const reporteExisteEnTransaccion = crearReporteExisteEnTransaccion(
  repositorioDeReportesSql,
);
export const listarReportes = crearListarReportes(repositorioDeReportesSql);
export const listarReportesParaMapa = crearListarReportesParaMapa(
  lectorDeReportesDeMapaSql,
);
export const listarReportesDeCalleEnTransaccion = (
  tx: TransaccionTenant,
  calleId: string,
) => lectorDeReportesDeMapaSql.listarPorCalle(tx, calleId);
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
 * S1 de `gestion-municipal`: el umbral de atraso del municipio. La lectura
 * la usa la bandeja para la insignia y el mapa para su senal; la escritura
 * solo `ADMIN_MUNICIPAL`, desde `/reportes/configuracion`.
 */
export const leerUmbralDeAtraso = crearLeerUmbralDeAtraso(
  repositorioDeConfiguracionDeReportesSql,
);
export const cambiarUmbralDeAtraso = crearCambiarUmbralDeAtraso(
  repositorioDeConfiguracionDeReportesSql,
);
/**
 * La cara que usa `intervenciones` para programar y cerrar obra (S2 y S3 de
 * `intervenciones-trazabilidad`): sus dos operaciones reciben el `tx` de quien
 * las llama, para que la obra y el movimiento del reporte confirmen juntos.
 */
export const reporteParaIntervencion = crearReporteParaIntervencion({
  repositorio: repositorioDeReportesSql,
  movimientos: registroDeMovimientosSql,
});

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
 *
 * `folios_de_reportes` cierra el conjunto (S2 de
 * `odd/tasks/exportacion-de-datos.md`): sin el contador, quien reciba los
 * datos no puede seguir la numeracion sin repetirla. Sale sin `id` porque
 * la tabla no lo tiene -su identidad es la pareja municipio/anio, y el
 * municipio es el que ya eligio quien exporta-.
 */
export const porcionesDeReportes: readonly [
  PorcionExportable,
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
  {
    nombre: "folios_de_reportes",
    leer: (tx) =>
      tx
        .select({
          anio: foliosDeReportes.anio,
          ultimoConsecutivo: foliosDeReportes.ultimoConsecutivo,
        })
        .from(foliosDeReportes),
  },
];
