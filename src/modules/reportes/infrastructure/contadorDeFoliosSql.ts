import { sql } from "drizzle-orm";
import type { ContadorDeFolios } from "../application/puertosDeMovimientos";
import { foliosDeReportes } from "./esquema";

/**
 * El contador de folios (design.md seccion 4): la sentencia exacta
 * `INSERT ... ON CONFLICT (ayuntamiento_id, anio) DO UPDATE SET
 * ultimo_consecutivo = folios_de_reportes.ultimo_consecutivo + 1 RETURNING
 * ultimo_consecutivo`, con el builder de Drizzle -nunca `sql\`…\`` a mano-.
 * La referencia a la derecha del `SET` es a la fila existente, no a la
 * propuesta: Drizzle emite la calificacion que Postgres exige.
 *
 * Por que no tiene carrera bajo `READ COMMITTED`, por que un ROLLBACK no
 * consume folio y por que RLS no abre un hueco: esta escrito entero en
 * `constancias/design.md` seccion 4 y no se repite. Lo unico que cambia es
 * la aridad del `ON CONFLICT` -la tupla es doble, no triple: la decision 2
 * cerro que no se segmenta por tipo de incidencia-. La conclusion se hereda
 * con la misma fuerza y ademas esta medida en `constancias/
 * folio.integration.test.ts`.
 */
export const contadorDeFoliosSql: ContadorDeFolios = {
  async siguiente(tx, { ayuntamientoId, anio }) {
    const [fila] = await tx
      .insert(foliosDeReportes)
      .values({ ayuntamientoId, anio, ultimoConsecutivo: 1 })
      .onConflictDoUpdate({
        target: [foliosDeReportes.ayuntamientoId, foliosDeReportes.anio],
        set: {
          ultimoConsecutivo: sql`${foliosDeReportes.ultimoConsecutivo} + 1`,
        },
      })
      .returning({ consecutivo: foliosDeReportes.ultimoConsecutivo });

    if (!fila) {
      throw new Error(
        "El contador de folios no devolvio fila: INSERT ... RETURNING deberia devolver siempre una.",
      );
    }

    return fila.consecutivo;
  },
};
