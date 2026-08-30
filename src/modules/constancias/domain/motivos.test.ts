import { describe, expect, it } from "vitest";
import { MOTIVOS_DE_CANCELACION, MOTIVOS_DE_REIMPRESION } from "./motivos";

describe("MOTIVOS_DE_REIMPRESION", () => {
  it("es la union cerrada de la propuesta, sin OTRO", () => {
    expect(MOTIVOS_DE_REIMPRESION).toEqual([
      "EXTRAVIO",
      "DETERIORO",
      "EJEMPLAR_ADICIONAL",
    ]);
  });
});

describe("MOTIVOS_DE_CANCELACION", () => {
  it("es la union cerrada de la propuesta, sin OTRO", () => {
    expect(MOTIVOS_DE_CANCELACION).toEqual([
      "ERROR_DE_CAPTURA",
      "DATOS_INCORRECTOS",
      "SOLICITUD_DEL_INTERESADO",
    ]);
  });
});
