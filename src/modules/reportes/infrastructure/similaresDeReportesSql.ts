import { and, desc, eq, inArray } from "drizzle-orm";
import type { RepositorioDeReportes } from "../application/puertos";
import { reportes } from "./esquema";

/**
 * `similaresAbiertos` (tasks.md 7.1, design.md seccion 13), aparte de
 * `repositorioDeReportesSql.ts` por la metrica de lineas por archivo
 * (AGENTS.md, <= 200): el buscador de similares es un tema propio -una
 * sola consulta indexada, sin escritura- y separarlo es lo que deja al
 * resto del repositorio bajo el limite. `repositorioDeReportesSql.ts` lo
 * incorpora por spread.
 */
export const similaresDeReportesSql: Pick<
  RepositorioDeReportes,
  "similaresAbiertos"
> = {
  async similaresAbiertos(tx, { lugarId, tipo }) {
    // Builder, nunca `sql` crudo (design.md seccion 13). Sin
    // `WHERE ayuntamiento_id` a mano: la politica de la tabla ya acota el
    // `SELECT` al tenant de la transaccion, mismo criterio que `listar`.
    // Sostenido por `reportes_similares_idx`
    // `(ayuntamiento_id, lugar_id, tipo, estado)`.
    return tx
      .select({
        id: reportes.id,
        folio: reportes.folio,
        estado: reportes.estado,
        descripcion: reportes.descripcion,
        registradoEn: reportes.registradoEn,
      })
      .from(reportes)
      .where(
        and(
          eq(reportes.lugarId, lugarId),
          eq(reportes.tipo, tipo),
          inArray(reportes.estado, ["RECIBIDO", "EN_ATENCION"]),
        ),
      )
      .orderBy(desc(reportes.registradoEn))
      .limit(10);
  },
};
