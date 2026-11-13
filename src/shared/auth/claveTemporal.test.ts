import { describe, expect, it } from "vitest";
import {
  ALFABETO_DE_CLAVE_TEMPORAL,
  generarClaveTemporal,
  LARGO_DE_CLAVE_TEMPORAL,
} from "./claveTemporal";
import { LARGO_MINIMO } from "./reglasDeClave";

/**
 * S4: la clave que el sistema entrega la primera vez. Lo que se prueba es
 * la propiedad que la operadora va a sufrir si falta —que se pueda dictar y
 * escribir sin equivocarse— y que no sea adivinable por repetirse.
 */

/** Los que se confunden entre si al leerlos en voz alta o en papel. */
const AMBIGUOS = ["0", "O", "1", "l", "I"];

const CLAVES = () => Array.from({ length: 200 }, generarClaveTemporal);

describe("generarClaveTemporal", () => {
  it("cumple el minimo de reglasDeClave y el largo que promete", () => {
    expect(LARGO_DE_CLAVE_TEMPORAL).toBeGreaterThanOrEqual(LARGO_MINIMO);
    expect(generarClaveTemporal()).toHaveLength(LARGO_DE_CLAVE_TEMPORAL);
  });

  it("solo usa caracteres del alfabeto que se dicta", () => {
    for (const clave of CLAVES()) {
      for (const caracter of clave) {
        expect(ALFABETO_DE_CLAVE_TEMPORAL).toContain(caracter);
      }
    }
  });

  it("no usa los caracteres que se confunden al dictarla", () => {
    const todas = CLAVES().join("");

    for (const ambiguo of AMBIGUOS) {
      expect(todas).not.toContain(ambiguo);
    }
  });

  it("no repite: dos altas seguidas no comparten contrasenia", () => {
    expect(new Set(CLAVES()).size).toBe(200);
  });
});
