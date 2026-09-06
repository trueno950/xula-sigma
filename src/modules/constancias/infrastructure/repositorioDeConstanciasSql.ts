import { and, eq, isNull } from "drizzle-orm";
import type { RepositorioDeConstancias } from "../application/puertos";
import { comoReimpresionId } from "../domain";
import { aConstanciaGuardada } from "./aConstanciaGuardada";
import { constancias, reimpresiones } from "./esquema";
import { listadoDeConstanciasSql } from "./listadoDeConstanciasSql";

/**
 * Implementacion real de `RepositorioDeConstancias`, mismo criterio que
 * `repositorioDeDocumentosSql`: el mismo Postgres que da RLS es el que
 * aisla cada operacion, cubierto por `constancias.isolation.test.ts` y los
 * tests de integracion de esta rebanada, no por un mock de este archivo.
 *
 * `guardar` y `buscarPorId` los usan `emitirConstancia` y `constanciaPorId`;
 * `paraValidar` es la superficie publica de `/validar/[folio]`;
 * `registrarReimpresion`, `bloquearPorId` y `cancelar` implementan el
 * ciclo de vida posterior a la emision que declara design.md seccion 10
 * (`reimprimirConstancia`, `cancelarConstancia`). `listar`/`buscar` viven en
 * `listadoDeConstanciasSql.ts` y se incorporan aca por spread (metrica de
 * lineas por archivo, `AGENTS.md`).
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

    return fila ? aConstanciaGuardada(fila) : null;
  },

  async bloquearPorId(tx, id) {
    const [fila] = await tx
      .select()
      .from(constancias)
      .where(eq(constancias.id, id))
      .for("update");

    return fila ? aConstanciaGuardada(fila) : null;
  },

  ...listadoDeConstanciasSql,

  async paraValidar(tx, folio) {
    const [fila] = await tx
      .select({
        tipo: constancias.tipo,
        emitidaEn: constancias.emitidaEn,
        canceladaEn: constancias.canceladaEn,
        codigoVerificacion: constancias.codigoVerificacion,
        datos: constancias.datos,
      })
      .from(constancias)
      .where(eq(constancias.folio, folio));

    if (!fila) return null;

    return { ...fila, datos: fila.datos as Record<string, unknown> };
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
