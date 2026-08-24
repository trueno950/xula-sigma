import { StringChunk } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { comoLugarId } from "../domain";
import { repositorioDeLugaresSql } from "./repositorioDeLugaresSql";

/**
 * `subarbol` es la unica funcion del archivo con `sql` crudo (el resto usa
 * el builder). No hay Postgres real en `unit` (vitest.config.ts), asi que
 * esto no ejecuta la consulta: inspecciona `queryChunks` -publico en la
 * clase `SQL` de drizzle-orm- para verificar que el CTE recursivo y su
 * cinturon de profundidad quedaron en el texto, y que `raizId` viaja como
 * parametro y no interpolado a mano. La correctitud real -que devuelva los
 * descendientes correctos- la prueba `lugares.integration.test.ts` contra
 * Postgres.
 */
describe("repositorioDeLugaresSql.subarbol", () => {
  it("arma un WITH RECURSIVE con el cinturon de profundidad y raizId como parametro", async () => {
    const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
    let consulta: { queryChunks: readonly unknown[] } | undefined;
    const execute = vi
      .fn()
      .mockImplementation(async (query: typeof consulta) => {
        consulta = query;
        return [];
      });
    const tx = { execute } as unknown as Parameters<
      typeof repositorioDeLugaresSql.subarbol
    >[0];

    await repositorioDeLugaresSql.subarbol(tx, raizId);

    expect(execute).toHaveBeenCalledTimes(1);
    if (!consulta) throw new Error("execute no recibio la consulta");
    // El texto literal de la plantilla queda envuelto en `StringChunk`
    // (`.value: string[]`); lo interpolado (`${raizId}`) viaja como valor
    // crudo en el arreglo, sin envoltorio, hasta que `toQuery()` lo
    // convierte en parametro — verificado leyendo `sql/sql.js` de
    // drizzle-orm 0.45.2.
    const texto = consulta.queryChunks
      .filter((trozo): trozo is StringChunk => trozo instanceof StringChunk)
      .flatMap((trozo) => trozo.value)
      .join(" ");

    expect(texto).toContain("RECURSIVE");
    expect(texto).toContain("profundidad < 8");

    const parametros = consulta.queryChunks.filter(
      (trozo) => typeof trozo === "string",
    );

    expect(parametros).toContain(raizId);
  });
});
