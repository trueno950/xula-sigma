import { describe, expect, it } from "vitest";
import { MOTIVOS_DE_RECHAZO } from "./motivos";

describe("MOTIVOS_DE_RECHAZO", () => {
  it("es la union cerrada de la propuesta, sin OTRO", () => {
    expect(MOTIVOS_DE_RECHAZO).toEqual([
      "DUPLICADO",
      "FUERA_DE_COMPETENCIA",
      "INFORMACION_INSUFICIENTE",
    ]);
  });
});
