import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe } from "../pruebas";

describe("folio-secuencia", () => {
  const id = "folio-secuencia";

  it("marca una secuencia de base de datos", () => {
    expect(
      hallazgosDe(id, [
        archivo("drizzle/0008_x.sql", "CREATE SEQUENCE folio_constancias;\n"),
      ]),
    ).toHaveLength(1);
  });

  it("no marca un contador por tenant", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "drizzle/0008_x.sql",
          'CREATE TABLE "folios" (\n\t"ayuntamiento_id" uuid NOT NULL,\n\t"siguiente" integer NOT NULL\n);\n',
        ),
      ]),
    ).toEqual([]);
  });
});
