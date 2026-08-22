import { describe, expect, it } from "vitest";
import { CurpInvalidaError, normalizarCurp } from "./curp";

describe("normalizarCurp", () => {
  it("cadena vacia normaliza a null", () => {
    expect(normalizarCurp("")).toBeNull();
  });

  it("cadena de solo espacios normaliza a null", () => {
    expect(normalizarCurp("   ")).toBeNull();
  });

  it("una CURP con formato valido se guarda en mayusculas", () => {
    expect(normalizarCurp("vecj880326hdflrr05")).toBe("VECJ880326HDFLRR05");
  });

  it("rechaza un formato invalido", () => {
    expect(() => normalizarCurp("no-es-una-curp")).toThrow(CurpInvalidaError);
  });

  it("rechaza una cadena de largo distinto a 18", () => {
    expect(() => normalizarCurp("VECJ880326HDFLRR0")).toThrow(
      CurpInvalidaError,
    );
  });
});
