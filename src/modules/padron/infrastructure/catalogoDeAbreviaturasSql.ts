import type { CatalogoDeAbreviaturas } from "../application/puertos";
import { abreviaturas } from "./esquema";

let cache: ReadonlyMap<string, string> | undefined;

/**
 * Catalogo de abreviaturas (ADR 0002 seccion 4), memoizado por proceso.
 *
 * Seguro de memoizar sin filtrar entre municipios: `abreviaturas` es tabla
 * de plataforma sin `ayuntamientoId` (invariantes-criticos.md seccion 1),
 * asi que no hay nada tenant-especifico que un mapa `ma -> maria` pueda
 * mezclar entre Motul y Ticul.
 */
export const catalogoDeAbreviaturasSql: CatalogoDeAbreviaturas = {
  async leer(tx) {
    if (cache) return cache;

    const filas = await tx.select().from(abreviaturas);
    cache = new Map(filas.map((fila) => [fila.corta, fila.larga]));

    return cache;
  },
};
