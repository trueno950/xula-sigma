import { isTable } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as superficie from "./index";

/**
 * Mismo mecanismo que `territorio/superficiePublica.test.ts` y
 * `constancias/superficiePublica.test.ts`: el objeto de tabla no puede
 * salir del barrel.
 */
describe("superficie publica de reportes", () => {
  it("no exporta ningun objeto de tabla Drizzle", () => {
    const tablas = Object.values(superficie).filter((valor) => isTable(valor));

    expect(tablas).toHaveLength(0);
  });
});
