import { describe, expect, it } from "vitest";
import { etiquetaDeRol } from "./etiquetaDeRol";

describe("etiquetaDeRol", () => {
  it("nombra el rol como lo dice una persona, no como lo guarda la base", () => {
    expect(etiquetaDeRol("ADMIN_MUNICIPAL")).toBe("Administrador");
    expect(etiquetaDeRol("OPERADOR")).toBe("Operador");
    expect(etiquetaDeRol("CONSULTA")).toBe("Consulta");
  });

  it("devuelve el rol tal cual cuando no tiene etiqueta", () => {
    expect(etiquetaDeRol("SUPER_ADMIN")).toBe("SUPER_ADMIN");
  });
});
