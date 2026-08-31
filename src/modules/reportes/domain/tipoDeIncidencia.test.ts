import { describe, expect, it } from "vitest";
import { TIPOS_DE_INCIDENCIA } from "./tipoDeIncidencia";

describe("TIPOS_DE_INCIDENCIA", () => {
  it("es la union cerrada de la propuesta, con OTRO", () => {
    expect(TIPOS_DE_INCIDENCIA).toEqual([
      "BACHE",
      "ALUMBRADO",
      "FUGA",
      "BASURA",
      "PARQUE",
      "OTRO",
    ]);
  });
});
