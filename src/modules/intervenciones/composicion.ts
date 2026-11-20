import type { PorcionExportable } from "@/shared/exportacion/exportar";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import {
  crearCambiarEstadoDeIntervencion,
  crearCorregirIntervencion,
  crearIntervencionConReferencias,
  crearIntervencionPorId,
  crearListarIntervenciones,
  crearListarIntervencionesParaMapa,
  crearProgramarObraDeReporte,
  crearRegistrarIntervencion,
} from "./application";
import { crearObrasDeReporte } from "./application/obrasDeReporte";
import {
  crearLectorDeReferenciasPorModulos,
  crearLectorDeReportesPorReportes,
  crearLectorDeUbicacionesPorTerritorio,
  crearReportesParaObraPorReportes,
  lectorDeIntervencionesDeMapaSql,
  lectorDeIntervencionesSql,
  obrasDeReporteSql,
  repositorioDeIntervencionesSql,
} from "./infrastructure";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "./infrastructure/esquema";

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
export const listarIntervenciones = crearListarIntervenciones(
  lectorDeIntervencionesSql,
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
  reportes: crearReportesParaObraPorReportes(),
});

/**
 * «Programar obra» desde el detalle de un reporte (S2 de
 * `intervenciones-trazabilidad`): crea la intervencion planificada y mueve el
 * reporte en la misma transaccion.
 */
export const programarObraDeReporte = crearProgramarObraDeReporte({
  repositorio: repositorioDeIntervencionesSql,
  reportes: crearReportesParaObraPorReportes(),
});

/**
 * «Las obras de este reporte» (S16 de `intervenciones-ux`): lo que la ficha
 * del reporte necesita para mostrar la que ya existe y para comprobar contra
 * el servidor el `?obra=` de la URL antes de pintar el enlace.
 */
export const obrasDeReporte = crearObrasDeReporte({
  listar: obrasDeReporteSql.listar,
});

/**
 * Lo que `intervenciones` aporta al exportador de plataforma (S2 de
 * `odd/tasks/exportacion-de-datos.md`). Se construye aca mismo criterio que
 * `porcionDePadron`, `porcionesDeTerritorio` y `porcionesDeConstancias`:
 * cableado en la raiz de composicion del modulo, no en `infrastructure`.
 *
 * Columnas explicitas, nunca `select()` pelado, y sin `ayuntamientoId`
 * -redundante, ya lo sabe quien pide la exportacion-. `descripcion` viaja
 * porque el archivo municipal tiene que poder reconstruir que se hizo, el
 * mismo argumento con el que `constancias` incluye `codigoVerificacion`.
 *
 * `revisiones_de_intervenciones` lleva `valoresAnteriores` completo: es la
 * unica copia del estado previo de una intervencion corregida, y sin el la
 * historia de correcciones se lee sin saber que cambio. No lleva ningun
 * dato sensible: son los campos de la propia intervencion.
 */
export const porcionesDeIntervenciones: readonly [
  PorcionExportable,
  PorcionExportable,
] = [
  {
    nombre: "intervenciones",
    leer: (tx) =>
      tx
        .select({
          id: intervenciones.id,
          tipo: intervenciones.tipo,
          estado: intervenciones.estado,
          fechaDeOcurrencia: intervenciones.fechaDeOcurrencia,
          lugarId: intervenciones.lugarId,
          calleId: intervenciones.calleId,
          reporteId: intervenciones.reporteId,
          descripcion: intervenciones.descripcion,
          registradoPorUsuarioId: intervenciones.registradoPorUsuarioId,
          capturadoEn: intervenciones.capturadoEn,
          actualizadoEn: intervenciones.actualizadoEn,
        })
        .from(intervenciones),
  },
  {
    nombre: "revisiones_de_intervenciones",
    leer: (tx) =>
      tx
        .select({
          id: revisionesDeIntervenciones.id,
          intervencionId: revisionesDeIntervenciones.intervencionId,
          valoresAnteriores: revisionesDeIntervenciones.valoresAnteriores,
          usuarioId: revisionesDeIntervenciones.usuarioId,
          ocurridoEn: revisionesDeIntervenciones.ocurridoEn,
        })
        .from(revisionesDeIntervenciones),
  },
];
