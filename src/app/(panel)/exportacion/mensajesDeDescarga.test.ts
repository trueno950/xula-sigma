import { describe, expect, it } from "vitest";
import {
  CODIGOS_DE_DESCARGA,
  codigoDeDescarga,
  formatearFilas,
  formatearTamano,
  MENSAJES_DE_DESCARGA,
} from "./mensajesDeDescarga";

/**
 * Los codigos con los que el borde de la descarga cuenta un fallo (S13) y los
 * numeros de la pantalla (S11, S12).
 *
 * El codigo viaja en la URL y la pagina lo traduce: lo que se prueba es que un
 * valor que no este en la lista cerrada se descarte, en vez de pintarse.
 */

describe("codigoDeDescarga", () => {
  it.each(CODIGOS_DE_DESCARGA)("acepta el codigo %s", (codigo) => {
    expect(codigoDeDescarga(codigo)).toBe(codigo);
  });

  it.each([
    ["un texto que no es codigo", "No se pudo armar el archivo."],
    ["el codigo en mayusculas", "FALLO"],
    ["un arreglo, como llega un parametro repetido", ["fallo", "fallo"]],
    ["un objeto", { codigo: "fallo" }],
    ["nada", undefined],
  ])("descarta %s", (_caso, valor) => {
    expect(codigoDeDescarga(valor)).toBeNull();
  });
});

describe("MENSAJES_DE_DESCARGA", () => {
  it("cada codigo tiene su mensaje, redactado para la operadora", () => {
    for (const codigo of CODIGOS_DE_DESCARGA) {
      expect(MENSAJES_DE_DESCARGA[codigo]).toMatch(/\.$/);
    }
  });

  it("el fallo dice que no se descargo nada y como reintentar", () => {
    expect(MENSAJES_DE_DESCARGA.fallo).toContain(
      "No se pudo armar el archivo.",
    );
    expect(MENSAJES_DE_DESCARGA.fallo).toContain("No se descargó nada");
    expect(MENSAJES_DE_DESCARGA.fallo).toContain("administrador municipal");
  });
});

describe("formatearFilas", () => {
  it("separa los miles como se lee en Mexico", () => {
    expect(formatearFilas(13110)).toBe("13,110");
    expect(formatearFilas(0)).toBe("0");
    expect(formatearFilas(7)).toBe("7");
  });
});

describe("formatearTamano", () => {
  it("dice el tamano en la unidad que se lee de un vistazo", () => {
    expect(formatearTamano(512)).toBe("512 B");
    expect(formatearTamano(1536)).toBe("1.5 KB");
    expect(formatearTamano(2_500_000)).toBe("2.4 MB");
  });
});
