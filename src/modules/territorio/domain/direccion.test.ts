import { describe, expect, it } from "vitest";
import { componerDireccion, transversalesValidas } from "./direccion";
import { comoCalleId } from "./identificadores";

const calleA = comoCalleId("11111111-1111-4111-8111-111111111111");
const calleB = comoCalleId("22222222-2222-4222-8222-222222222222");
const calleC = comoCalleId("33333333-3333-4333-8333-333333333333");

describe("transversalesValidas", () => {
  it("acepta las tres calles cuando son distintas entre si", () => {
    expect(transversalesValidas(calleA, calleB, calleC)).toBe(true);
  });

  it("rechaza si calleId coincide con entreCalleAId", () => {
    expect(transversalesValidas(calleA, calleA, calleC)).toBe(false);
  });

  it("rechaza si calleId coincide con entreCalleBId", () => {
    expect(transversalesValidas(calleA, calleB, calleA)).toBe(false);
  });

  it("rechaza si entreCalleAId coincide con entreCalleBId", () => {
    expect(transversalesValidas(calleA, calleB, calleB)).toBe(false);
  });

  it("acepta transversales nulas -comisaria rural sin cruces conocidos-", () => {
    expect(transversalesValidas(calleA, null, null)).toBe(true);
  });

  it("acepta una sola transversal presente", () => {
    expect(transversalesValidas(calleA, calleB, null)).toBe(true);
  });
});

describe("componerDireccion", () => {
  it("numero null incluye 'S/N' en el texto", () => {
    const texto = componerDireccion({
      calle: "Calle 20",
      numero: null,
      entreCalleA: null,
      entreCalleB: null,
      referencia: null,
      ancestros: [],
    });

    expect(texto).toContain("S/N");
  });

  it("incluye las dos transversales presentes con su conector", () => {
    const texto = componerDireccion({
      calle: "Calle 20",
      numero: "105",
      entreCalleA: "Calle 21",
      entreCalleB: "Calle 23",
      referencia: null,
      ancestros: [],
    });

    expect(texto).toContain("Calle 21");
    expect(texto).toContain("Calle 23");
  });

  it("sin transversales ni referencia las omite sin dejar separadores huerfanos", () => {
    const texto = componerDireccion({
      calle: "Calle 20",
      numero: "105",
      entreCalleA: null,
      entreCalleB: null,
      referencia: null,
      ancestros: [],
    });

    expect(texto).not.toMatch(/,\s*,/);
    expect(texto).not.toMatch(/,\s*$/);
    expect(texto.trim()).toBe(texto);
  });

  it("la cadena de ancestros completa aparece del mas profundo al mas superficial", () => {
    const texto = componerDireccion({
      calle: "Calle 20",
      numero: "105",
      entreCalleA: null,
      entreCalleB: null,
      referencia: null,
      ancestros: ["Manzana 5", "Colonia Centro", "Sector 2", "Comisaria X"],
    });

    const indiceManzana = texto.indexOf("Manzana 5");
    const indiceColonia = texto.indexOf("Colonia Centro");
    const indiceSector = texto.indexOf("Sector 2");
    const indiceComisaria = texto.indexOf("Comisaria X");

    expect(indiceManzana).toBeGreaterThanOrEqual(0);
    expect(indiceColonia).toBeGreaterThan(indiceManzana);
    expect(indiceSector).toBeGreaterThan(indiceColonia);
    expect(indiceComisaria).toBeGreaterThan(indiceSector);
  });
});
