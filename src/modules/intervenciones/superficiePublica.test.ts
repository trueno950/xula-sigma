import { isTable } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as superficie from "./index";

describe("superficie publica de intervenciones", () => {
  it("no exporta objetos de tabla Drizzle", () => {
    const tablas = Object.values(superficie).filter((valor) => isTable(valor));

    expect(tablas).toHaveLength(0);
  });
});
