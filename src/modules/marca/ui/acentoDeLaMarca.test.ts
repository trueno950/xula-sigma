import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, contraste, textoSobre } from "@/shared/marca";
import {
  ACENTO_POR_DEFECTO,
  medirAcento,
  razonFormateada,
} from "./acentoDeLaMarca";

/**
 * S3: la muestra no promete una legibilidad que el color no tiene. El acento
 * se pinta con el texto que **mide** mas contraste, y el numero que la
 * pantalla dice es el medido, no el que el artboard mostraba con el color de
 * ejemplo.
 *
 * El caso de la auditoria fue el chip del acento `#e07800` con blanco encima:
 * 3.01:1 en un numero, 1.61:1 en el otro, y el chip se leia como si fuera
 * texto de la marca.
 */

const GLOBALS = readFileSync(
  resolve(import.meta.dirname, "../../../app/globals.css"),
  "utf8",
);

const acentoPorDefectoEnElCss = (): string | undefined =>
  /--color-acento:\s*var\(--accent,\s*(oklch\([^)]*\))\)/.exec(GLOBALS)?.[1];

describe("medirAcento", () => {
  it("el acento por defecto es el de globals.css", () => {
    // Una copia que diverge mide el contraste contra un color que la pagina
    // no pinta, y la pantalla diria un numero que nadie ve.
    expect(acentoPorDefectoEnElCss()).toBe(ACENTO_POR_DEFECTO);
  });

  it("sin acento guardado mide el de por defecto", () => {
    const medido = medirAcento(undefined);

    expect(medido?.color).toBe(ACENTO_POR_DEFECTO);
    expect(medido?.razon).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });

  it("el acento de la auditoria lleva el texto que mas contrasta, no blanco", () => {
    const medido = medirAcento("#e07800");

    expect(medido).not.toBeNull();
    // El chip del hallazgo M3: blanco encima daba 3.01:1. El texto medido es
    // el otro extremo y supera el piso.
    expect(medido?.texto).toBe(textoSobre("#e07800"));
    expect(medido?.texto).not.toBe("#ffffff");
    expect(medido?.razon).toBeCloseTo(
      contraste("#e07800", medido?.texto ?? "") ?? 0,
      10,
    );
    expect(medido?.razon).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });

  it("un color que no se puede medir no lleva texto encima", () => {
    // Defensa: `validarMarca` ya rechaza estos valores, pero la muestra no
    // puede prometer un texto legible sobre algo que no sabe medir.
    expect(medirAcento("rebeccapurple")).toBeNull();
  });

  it("el numero que se muestra va con un decimal, como una razon", () => {
    expect(razonFormateada(5.63)).toBe("5.6:1");
    expect(razonFormateada(4.5)).toBe("4.5:1");
  });
});
