import { isTable } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as superficie from "./index";

/**
 * Mismo mecanismo que `padron/superficiePublica.test.ts`: el objeto de
 * tabla no puede salir del barrel. Aca no lo justifica una fusion -no hay
 * ninguna todavia-, lo justifica que el CTE de subarbol y el indice
 * parcial de `residencias` son la unica implementacion correcta de esas
 * consultas, y un `.from(lugares)` desde otro modulo las esquiva
 * (design.md decision 3).
 */
describe("superficie publica de territorio", () => {
  it("no exporta ningun objeto de tabla Drizzle", () => {
    const tablas = Object.values(superficie).filter((valor) => isTable(valor));

    expect(tablas).toHaveLength(0);
  });
});
