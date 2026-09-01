import { and, eq, type SQL } from "drizzle-orm";
import type {
  ReporteGuardado,
  RepositorioDeReportes,
} from "../application/puertos";
import { reportes } from "./esquema";

/**
 * Implementacion real de `RepositorioDeReportes`, mismo criterio que
 * `repositorioDeConstanciasSql`: el mismo Postgres que da RLS es el que
 * aisla cada operacion, cubierto por los tests de aislamiento y los de
 * integracion de esta rebanada, no por un mock de este archivo.
 *
 * Esta rebanada solo implementa `guardar`, `buscarPorId` y `listar` -los
 * tres que `registrarReporte`, `reportePorId` y `listarReportes` necesitan-
 * (tasks.md 4.7). El resto del contrato de `RepositorioDeReportes` se
 * completa en las Fases 5 (`candidatoAOriginal`, `aplicarTransicion`,
 * `asignarArea`) y 7 (`similaresAbiertos`, `contarDuplicadosDe`,
 * `paraConsultaPublica*`) sobre este mismo archivo.
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
  "guardar" | "buscarPorId" | "listar"
> = {
  async guardar(tx, datos) {
    await tx.insert(reportes).values(datos);
  },

  async buscarPorId(tx, id) {
    const [fila] = await tx.select().from(reportes).where(eq(reportes.id, id));

    return fila ? aReporteGuardado(fila) : null;
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
};
