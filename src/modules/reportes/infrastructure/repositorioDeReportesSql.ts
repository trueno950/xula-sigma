import { and, count, eq, inArray, type SQL } from "drizzle-orm";
import type {
  ReporteGuardado,
  RepositorioDeReportes,
} from "../application/puertos";
import { comoReporteId, ESTADOS_DE_REPORTE, esTerminal } from "../domain";
import { consultaPublicaDeReportesSql } from "./consultaPublicaDeReportesSql";
import { reportes } from "./esquema";
import { similaresDeReportesSql } from "./similaresDeReportesSql";

const ESTADOS_NO_TERMINALES = ESTADOS_DE_REPORTE.filter(
  (estado) => !esTerminal(estado),
);

/**
 * Implementacion real de `RepositorioDeReportes`, mismo criterio que
 * `repositorioDeConstanciasSql`: el mismo Postgres que da RLS es el que
 * aisla cada operacion, cubierto por los tests de aislamiento y los de
 * integracion de esta rebanada, no por un mock de este archivo.
 *
 * Esta rebanada agrega `candidatoAOriginal`, `aplicarTransicion`,
 * `asignarArea` y `contarDuplicadosDe` -los cuatro que `cambiarEstadoDeReporte`,
 * `asignarAreaDeReporte` y el conteo de duplicados de tasks.md 5.13 necesitan-
 * (tasks.md 5.3, 5.14), sobre `guardar`, `buscarPorId` y `listar` de la
 * Fase 4. `paraConsultaPublica`/`paraConsultaPublicaPorId` entran en esta
 * rebanada (tasks.md Fase 6) para `consultarFolioDeReporte`;
 * `similaresAbiertos` (tasks.md 7.1) cierra el contrato completo.
 */
const aReporteGuardado = (
  fila: typeof reportes.$inferSelect,
): ReporteGuardado => ({
  id: fila.id,
  folio: fila.folio,
  tipo: fila.tipo,
  estado: fila.estado,
  areaResponsable: fila.areaResponsable,
  lugarId: fila.lugarId,
  calleId: fila.calleId,
  referencia: fila.referencia,
  descripcion: fila.descripcion,
  personaId: fila.personaId,
  motivoDeRechazo: fila.motivoDeRechazo,
  duplicadoDeReporteId: fila.duplicadoDeReporteId,
  registradoPorUsuarioId: fila.registradoPorUsuarioId,
  registradoEn: fila.registradoEn,
  actualizadoEn: fila.actualizadoEn,
});

export const repositorioDeReportesSql: Pick<
  RepositorioDeReportes,
  | "guardar"
  | "buscarPorId"
  | "listar"
  | "candidatoAOriginal"
  | "aplicarTransicion"
  | "asignarArea"
  | "contarDuplicadosDe"
  | "paraConsultaPublica"
  | "paraConsultaPublicaPorId"
  | "similaresAbiertos"
> = {
  async guardar(tx, datos) {
    await tx.insert(reportes).values(datos);
  },

  async buscarPorId(tx, id) {
    const [fila] = await tx.select().from(reportes).where(eq(reportes.id, id));

    return fila ? aReporteGuardado(fila) : null;
  },

  async candidatoAOriginal(tx, id) {
    // `id` llega como `string` desde el caso de uso -es el `duplicadoDe`
    // que eligio el operador, todavia sin verificar (design.md seccion 3)-;
    // `comoReporteId` es el borde donde se vuelve el tipo marcado que espera
    // la columna, mismo criterio que `?raiz=` en `territorio`.
    const [fila] = await tx
      .select({
        id: reportes.id,
        duplicadoDeReporteId: reportes.duplicadoDeReporteId,
      })
      .from(reportes)
      .where(eq(reportes.id, comoReporteId(id)));

    return fila ?? null;
  },

  async aplicarTransicion(tx, datos) {
    // `WHERE id = $1 AND estado = $anterior` es el mecanismo de concurrencia
    // (design.md seccion 12, mismo criterio que `cancelarConstancia`): dos
    // transiciones simultaneas se serializan sobre la fila y la segunda
    // afecta cero filas porque el estado que leyo ya no esta.
    const filas = await tx
      .update(reportes)
      .set({
        estado: datos.estadoNuevo,
        motivoDeRechazo: datos.motivoDeRechazo,
        duplicadoDeReporteId:
          datos.duplicadoDeReporteId === null
            ? null
            : comoReporteId(datos.duplicadoDeReporteId),
        actualizadoEn: new Date(),
      })
      .where(
        and(
          eq(reportes.id, datos.id),
          eq(reportes.estado, datos.estadoAnterior),
        ),
      )
      .returning({ id: reportes.id });

    return filas.length > 0;
  },

  async asignarArea(tx, datos) {
    // Mismo mecanismo de concurrencia que `aplicarTransicion`: el `WHERE`
    // decide, no la lectura previa. `asignarAreaDeReporte` ya evalua
    // `esTerminal` antes de llegar aca, pero esa lectura y este UPDATE
    // corren en la misma transaccion bajo READ COMMITTED -una transicion a
    // terminal que confirma en el medio no la ve una consulta anterior de
    // esta misma transaccion. Sin este WHERE, esa asignacion pasaba sobre
    // un reporte ya cerrado (verify-report.md de `reportes-ciudadanos`).
    const filas = await tx
      .update(reportes)
      .set({
        areaResponsable: datos.areaResponsable,
        actualizadoEn: new Date(),
      })
      .where(
        and(
          eq(reportes.id, datos.id),
          inArray(reportes.estado, ESTADOS_NO_TERMINALES),
        ),
      )
      .returning({ id: reportes.id });

    return filas.length > 0;
  },

  async contarDuplicadosDe(tx, id) {
    // Consulta directa sobre `reportes_duplicado_idx`
    // `(ayuntamiento_id, duplicado_de_reporte_id)`: RLS aporta la igualdad
    // de tenant, esta aporta la de `duplicado_de_reporte_id`, y las dos
    // juntas son las columnas lider del indice (design.md seccion 13, mismo
    // argumento que `contarHijosActivos`).
    const [fila] = await tx
      .select({ total: count() })
      .from(reportes)
      .where(eq(reportes.duplicadoDeReporteId, id));

    return fila?.total ?? 0;
  },

  async listar(tx, filtros) {
    // Sin `WHERE ayuntamiento_id` a mano: la politica de la tabla ya acota
    // el SELECT al tenant de la transaccion (mismo criterio que
    // `similaresAbiertos`, design.md seccion 13).
    const condiciones: SQL[] = [];
    if (filtros.estado !== undefined) {
      condiciones.push(eq(reportes.estado, filtros.estado));
    }
    if (filtros.tipo !== undefined) {
      condiciones.push(eq(reportes.tipo, filtros.tipo));
    }

    const filas = await tx
      .select()
      .from(reportes)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined);

    return filas.map(aReporteGuardado);
  },

  ...consultaPublicaDeReportesSql,
  ...similaresDeReportesSql,
};
