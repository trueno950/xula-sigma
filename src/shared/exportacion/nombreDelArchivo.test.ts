import { describe, expect, it } from "vitest";
import { nombreDelArchivo } from "./archivoDeExportacion";

/**
 * El nombre del ZIP. Archivo aparte de `archivoDeExportacion.test.ts`, que ya
 * pasaba las 200 lineas por archivo de `AGENTS.md`: el contenido del archivo
 * entregado y el nombre con que se entrega son dos afirmaciones distintas.
 */

describe("nombreDelArchivo", () => {
  it("lleva el subdominio y la fecha civil de Merida", () => {
    // 02:00 UTC del 14 son las 20:00 del 13 en Merida: el nombre no puede
    // decir 14, porque quien lo recibe abre el archivo del dia que fue.
    expect(
      nombreDelArchivo("motul", new Date("2026-11-14T02:00:00.000Z")),
    ).toBe("motul-2026-11-13.zip");
    expect(
      nombreDelArchivo("ticul", new Date("2026-11-13T23:05:00.000Z")),
    ).toBe("ticul-2026-11-13.zip");
  });
});
