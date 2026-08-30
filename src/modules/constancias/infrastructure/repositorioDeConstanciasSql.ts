import { and, eq, isNull } from "drizzle-orm";
import type { RepositorioDeConstancias } from "../application/puertos";
import { comoConstanciaId, comoReimpresionId } from "../domain";
import { constancias, reimpresiones } from "./esquema";

/**
 * Implementacion real de `RepositorioDeConstancias`, mismo criterio que
 * `repositorioDeDocumentosSql`: el mismo Postgres que da RLS es el que
 * aisla cada operacion, cubierto por `constancias.isolation.test.ts` y los
 * tests de integracion de esta rebanada, no por un mock de este archivo.
 *
 * `guardar` y `buscarPorId` son los unicos que usa `emitirConstancia` y
 * `constanciaPorId` en esta rebanada; `paraValidar`, `registrarReimpresion`
 * y `cancelar` completan el puerto que declara design.md seccion 10 para
 * los casos de uso de reimpresion y cancelacion de una rebanada posterior.
 */
export const repositorioDeConstanciasSql: RepositorioDeConstancias = {
  async guardar(tx, datos) {
    await tx.insert(constancias).values(datos);
  },

  async buscarPorId(tx, id) {
    const [fila] = await tx
      .select()
      .from(constancias)
      .where(eq(constancias.id, id));

    if (!fila) return null;

    return {
      ...fila,
      id: comoConstanciaId(fila.id),
      datos: fila.datos as Record<string, unknown>,
    };
  },

  async bloquearPorId(tx, id) {
    const [fila] = await tx
      .select()
      .from(constancias)
      .where(eq(constancias.id, id))
      .for("update");

    if (!fila) return null;

    return {
      ...fila,
      id: comoConstanciaId(fila.id),
      datos: fila.datos as Record<string, unknown>,
    };
  },

  async listar(tx, ayuntamientoId) {
    const filas = await tx
      .select()
      .from(constancias)
      .where(eq(constancias.ayuntamientoId, ayuntamientoId));

    return filas.map((fila) => ({
      ...fila,
      id: comoConstanciaId(fila.id),
      datos: fila.datos as Record<string, unknown>,
    }));
  },

  async paraValidar(tx, folio) {
    const [fila] = await tx
      .select({
        folio: constancias.folio,
        codigoVerificacion: constancias.codigoVerificacion,
        canceladaEn: constancias.canceladaEn,
      })
      .from(constancias)
      .where(eq(constancias.folio, folio));

    return fila ?? null;
  },

  async registrarReimpresion(
    tx,
    { ayuntamientoId, constanciaId, usuarioId, motivo },
  ) {
    const [fila] = await tx
      .insert(reimpresiones)
      .values({ ayuntamientoId, constanciaId, usuarioId, motivo })
      .returning({ id: reimpresiones.id });

    if (!fila) {
      throw new Error(
        "registrarReimpresion no devolvio fila: INSERT ... RETURNING deberia devolver siempre una.",
      );
    }

    return comoReimpresionId(fila.id);
  },

  async existeReimpresion(tx, id, constanciaId) {
    // `id` y `constanciaId` juntos en el WHERE: RLS ya acota `ayuntamiento_id`
    // a la transaccion activa, y esta condicion agrega la otra mitad del FK
    // compuesto -que la fila sea de **esta** constancia, no de otra del mismo
    // tenant- (design.md de `constancias-oficios`, seccion 11).
    const [fila] = await tx
      .select({ id: reimpresiones.id })
      .from(reimpresiones)
      .where(
        and(
          eq(reimpresiones.id, id),
          eq(reimpresiones.constanciaId, constanciaId),
        ),
      );

    return fila !== undefined;
  },

  async cancelar(tx, { id, motivo, usuarioId }) {
    // `WHERE cancelada_en IS NULL` es tambien el mecanismo de concurrencia
    // (design.md seccion 10): dos cancelaciones simultaneas se serializan
    // sobre la fila y la segunda afecta cero filas, sin rama adicional.
    const filas = await tx
      .update(constancias)
      .set({
        canceladaEn: new Date(),
        canceladaPorUsuarioId: usuarioId,
        motivoCancelacion: motivo,
      })
      .where(and(eq(constancias.id, id), isNull(constancias.canceladaEn)))
      .returning({ id: constancias.id });

    return filas.length > 0;
  },
};
