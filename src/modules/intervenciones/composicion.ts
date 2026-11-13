import type { PorcionExportable } from "@/shared/exportacion/exportar";
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
