import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Capa C de design.md decision 1: lo unico que las capas A (barrel sin la
 * tabla) y B (FK escrito a mano, sin objeto Drizzle) no cierran es SQL
 * crudo por texto. Este test escanea por eso.
 *
 * **Limite declarado, no arreglado aca:** no cubre un nombre de tabla
 * armado dinamicamente ni un `.sql` de `scripts/` (design.md decision 1).
 */

const RAIZ = "src";
const EXCLUIDO = join(RAIZ, "modules", "padron");
const RASTRO_DE_PERSONAS = /\bpersona_id\b|\bpersonas\b/;

const archivosTs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    if (ruta === EXCLUIDO) return [];
    if (entrada.isDirectory()) return archivosTs(ruta);
    return /\.tsx?$/.test(entrada.name) ? [ruta] : [];
  });

const tieneSqlCrudoDePersonas = (contenido: string): boolean => {
  const plantillasSql = contenido.match(/sql`[^`]*`/g) ?? [];
  return plantillasSql.some((plantilla) => RASTRO_DE_PERSONAS.test(plantilla));
};

describe("identidadPorPuerto", () => {
  it("ningun modulo fuera de padron arma SQL crudo contra personas/persona_id", () => {
    const violaciones = archivosTs(RAIZ).filter((ruta) =>
      tieneSqlCrudoDePersonas(readFileSync(ruta, "utf8")),
    );

    expect(violaciones).toEqual([]);
  });
});
