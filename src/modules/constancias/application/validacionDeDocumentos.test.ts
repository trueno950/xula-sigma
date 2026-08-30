import { describe, expect, it } from "vitest";
import { leerDocumentos, validarDocumentos } from "./validacionDeDocumentos";

describe("validarDocumentos", () => {
  it("acepta un bloque de firma valido sin leyenda de pie", () => {
    const resultado = validarDocumentos({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
    });

    expect(resultado).toEqual({
      ok: true,
      documentos: {
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
      },
    });
  });

  it("acepta un bloque de firma valido con leyenda de pie", () => {
    const resultado = validarDocumentos({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
      leyendaDePie: "Documento sin validez fiscal.",
    });

    expect(resultado).toEqual({
      ok: true,
      documentos: {
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
        leyendaDePie: "Documento sin validez fiscal.",
      },
    });
  });

  it("rechaza un firmanteNombre bajo el minimo de 3 caracteres", () => {
    const resultado = validarDocumentos({
      firmanteNombre: "Jo",
      firmanteCargo: "Secretario Municipal",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("se esperaba un rechazo");
    expect(resultado.campos.firmanteNombre).toBeDefined();
  });

  it("rechaza un firmanteCargo bajo el minimo de 3 caracteres", () => {
    const resultado = validarDocumentos({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Se",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("se esperaba un rechazo");
    expect(resultado.campos.firmanteCargo).toBeDefined();
  });

  it("el error de firmanteNombre mapea a la clave firmanteNombre, no a firmante", () => {
    // Esquema plano y no anidado (design.md decision 8): un `firmante: {…}`
    // mandaria todos los errores al campo "firmante".
    const resultado = validarDocumentos({
      firmanteNombre: "Jo",
      firmanteCargo: "Secretario Municipal",
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error("se esperaba un rechazo");
    expect(Object.keys(resultado.campos)).toEqual(["firmanteNombre"]);
    expect(resultado.campos.firmante).toBeUndefined();
  });
});

describe("leerDocumentos", () => {
  it("devuelve el bloque de firma cuando es valido", () => {
    expect(
      leerDocumentos({
        firmanteNombre: "Juan Poot",
        firmanteCargo: "Secretario Municipal",
      }),
    ).toEqual({
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
    });
  });

  it("devuelve null (no {}) cuando el valor no valida", () => {
    // Diverge de `leerMarca` a proposito: sin firmante no se emite
    // (decision 19), degradar a valores por defecto renderizaria la hoja
    // sin firmante.
    expect(leerDocumentos({ firmanteNombre: "Jo" })).toBeNull();
  });

  it("devuelve null para lo que venga de una columna jsonb sin configurar", () => {
    for (const valor of [null, undefined, 42, "texto", [], {}]) {
      expect(leerDocumentos(valor)).toBeNull();
    }
  });
});
