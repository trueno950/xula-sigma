import { describe, expect, it } from "vitest";
import { normalizarParaBusqueda } from "./textoDeBusqueda";

describe("normalizarParaBusqueda", () => {
  it("ignora mayusculas, acentos y espacios de los bordes", () => {
    expect(normalizarParaBusqueda("  Mérida CÁRDENAS ")).toBe(
      "merida cardenas",
    );
  });

  it("conserva la enie como letra propia", () => {
    expect(normalizarParaBusqueda("Peña")).toBe("peña");
    expect(normalizarParaBusqueda("PEÑA")).toBe("peña");
    expect(normalizarParaBusqueda("Pena")).not.toBe(
      normalizarParaBusqueda("Peña"),
    );
  });
});
