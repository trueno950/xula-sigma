import { describe, expect, it } from "vitest";
import {
  componerDireccion,
  componerUbicacion,
  transversalesValidas,
} from "./direccion";
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

  it("incluye la unica transversal presente -comisaria rural con un solo cruce conocido, valida segun transversalesValidas-", () => {
    const texto = componerDireccion({
      calle: "Calle 20",
      numero: "105",
      entreCalleA: "Calle 21",
      entreCalleB: null,
      referencia: null,
      ancestros: [],
    });

    expect(texto).toContain("Calle 21");
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
    // Dos niveles: la colonia y el asentamiento que la contiene. El arbol de
    // direcciones ya no tiene escalones intermedios (design.md decision 5).
    const texto = componerDireccion({
      calle: "Calle 20",
      numero: "105",
      entreCalleA: null,
      entreCalleB: null,
      referencia: null,
      ancestros: ["Colonia Centro", "Comisaria X"],
    });

    const indiceColonia = texto.indexOf("Colonia Centro");
    const indiceComisaria = texto.indexOf("Comisaria X");

    expect(indiceColonia).toBeGreaterThanOrEqual(0);
    expect(indiceComisaria).toBeGreaterThan(indiceColonia);
  });
});

describe("componerUbicacion", () => {
  it("sin calle compone solo el ancestro, sin 'S/N' en ningun caso", () => {
    const texto = componerUbicacion({
      calle: null,
      ancestros: ["Colonia Centro"],
    });

    expect(texto).toBe("Colonia Centro");
    expect(texto).not.toContain("S/N");
  });

  it("con calle y los dos ancestros, todos presentes del mas profundo al mas superficial", () => {
    const texto = componerUbicacion({
      calle: "Calle 20",
      ancestros: ["Colonia Centro", "Comisaria X"],
    });

    const indiceCalle = texto.indexOf("Calle 20");
    const indiceColonia = texto.indexOf("Colonia Centro");
    const indiceComisaria = texto.indexOf("Comisaria X");

    expect(indiceCalle).toBe(0);
    expect(indiceColonia).toBeGreaterThan(indiceCalle);
    expect(indiceComisaria).toBeGreaterThan(indiceColonia);
  });

  it("sin calle ni ancestros compone una cadena vacia sin separadores huerfanos", () => {
    const texto = componerUbicacion({ calle: null, ancestros: [] });

    expect(texto).toBe("");
  });
});
