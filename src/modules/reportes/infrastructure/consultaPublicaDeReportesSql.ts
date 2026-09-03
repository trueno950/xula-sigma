import { eq } from "drizzle-orm";
import type { RepositorioDeReportes } from "../application/puertos";
import { comoReporteId } from "../domain";
import { reportes } from "./esquema";

const COLUMNAS_DE_CONSULTA_PUBLICA = {
  tipo: reportes.tipo,
  estado: reportes.estado,
  registradoEn: reportes.registradoEn,
  actualizadoEn: reportes.actualizadoEn,
  duplicadoDeReporteId: reportes.duplicadoDeReporteId,
} as const;

/**
 * `paraConsultaPublica`/`paraConsultaPublicaPorId` (tasks.md Fase 6,
 * design.md seccion 14), aparte de `repositorioDeReportesSql.ts` por la
 * metrica de lineas por archivo (AGENTS.md, <= 200), mismo criterio que
 * `similaresDeReportesSql.ts`: el salto del folio consultado al original
 * -cuando hay duplicado- es un tema propio, sin escritura.
 * `repositorioDeReportesSql.ts` lo incorpora por spread.
 */
export const consultaPublicaDeReportesSql: Pick<
  RepositorioDeReportes,
  "paraConsultaPublica" | "paraConsultaPublicaPorId"
> = {
  async paraConsultaPublica(tx, folio) {
    // Un `SELECT` de cinco columnas, ninguna de datos personales: el borde
    // publico nunca lee `descripcion`, `referencia`, `lugarId` ni `personaId`
    // (design.md seccion 14). La politica de la tabla acota el tenant.
    const [fila] = await tx
      .select(COLUMNAS_DE_CONSULTA_PUBLICA)
      .from(reportes)
      .where(eq(reportes.folio, folio));

    return fila ?? null;
  },

  async paraConsultaPublicaPorId(tx, id) {
    // El segundo `SELECT` del salto de design.md seccion 14 -mismas cinco
    // columnas, mismo criterio que `candidatoAOriginal` para el borde entre
    // `string` y `ReporteId`.
    const [fila] = await tx
      .select(COLUMNAS_DE_CONSULTA_PUBLICA)
      .from(reportes)
      .where(eq(reportes.id, comoReporteId(id)));

    return fila ?? null;
  },
};
