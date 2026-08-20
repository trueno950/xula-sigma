import { describe, expect, it } from "vitest";
import { validarPng } from "./png";

/**
 * Sin fixtures binarios: cada caso se arma con `pngDe(...)` o mutando su
 * salida. Un `.png` commiteado seria un blob que nadie puede leer en un
 * diff, y la propiedad que se prueba —"este byte concreto decide"— se
 * perderia. Ver design.md seccion 4.
 */

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const UN_MIB = 1024 * 1024;

function uint32BE(valor: number): number[] {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, valor, false);
  return Array.from(bytes);
}

/** Firma + IHDR minimo con las dimensiones dadas. 33 bytes: lo justo para
 * un chunk IHDR completo con CRC, sin que el CRC se valide. */
function pngDe({ ancho, alto }: { ancho: number; alto: number }): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set(FIRMA_PNG, 0);
  bytes.set(uint32BE(13), 8); // longitud del chunk IHDR
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  bytes.set(uint32BE(ancho), 16);
  bytes.set(uint32BE(alto), 20);
  return bytes;
}

describe("validarPng", () => {
  it("un archivo vacio se rechaza sin leer nada mas", () => {
    expect(validarPng(new Uint8Array(0))).toEqual({
      ok: false,
      motivo: "VACIO",
    });
  });

  it("mas de 1 MiB se rechaza por tamanio", () => {
    const bytes = new Uint8Array(UN_MIB + 1);
    bytes.set(pngDe({ ancho: 200, alto: 200 }), 0);

    expect(validarPng(bytes)).toEqual({
      ok: false,
      motivo: "DEMASIADO_GRANDE",
    });
  });

  it("exactamente 1 MiB pasa el chequeo de tamanio", () => {
    const bytes = new Uint8Array(UN_MIB);
    bytes.set(pngDe({ ancho: 200, alto: 200 }), 0);

    expect(validarPng(bytes)).toEqual({ ok: true, ancho: 200, alto: 200 });
  });

  it("un archivo truncado a 23 bytes no llega a declarar su alto", () => {
    const truncado = pngDe({ ancho: 200, alto: 200 }).slice(0, 23);

    expect(validarPng(truncado)).toEqual({ ok: false, motivo: "SIN_IHDR" });
  });

  it("un byte de la firma volteado no es PNG", () => {
    const bytes = pngDe({ ancho: 200, alto: 200 });
    bytes[1] = 0x00;

    expect(validarPng(bytes)).toEqual({ ok: false, motivo: "NO_ES_PNG" });
  });

  it("la firma de un JPEG no es PNG", () => {
    const bytes = pngDe({ ancho: 200, alto: 200 });
    bytes.set([0xff, 0xd8, 0xff], 0);

    expect(validarPng(bytes)).toEqual({ ok: false, motivo: "NO_ES_PNG" });
  });

  it("firma correcta con IEND en vez de IHDR", () => {
    const bytes = pngDe({ ancho: 200, alto: 200 });
    bytes.set(new TextEncoder().encode("IEND"), 12);

    expect(validarPng(bytes)).toEqual({ ok: false, motivo: "SIN_IHDR" });
  });

  it("79x80 se rechaza por el ancho", () => {
    expect(validarPng(pngDe({ ancho: 79, alto: 80 }))).toEqual({
      ok: false,
      motivo: "DIMENSIONES",
    });
  });

  it("80x79 se rechaza por el alto", () => {
    expect(validarPng(pngDe({ ancho: 80, alto: 79 }))).toEqual({
      ok: false,
      motivo: "DIMENSIONES",
    });
  });

  it("80x80 es el borde inferior valido", () => {
    expect(validarPng(pngDe({ ancho: 80, alto: 80 }))).toEqual({
      ok: true,
      ancho: 80,
      alto: 80,
    });
  });

  it("2048x2048 es el borde superior valido", () => {
    expect(validarPng(pngDe({ ancho: 2048, alto: 2048 }))).toEqual({
      ok: true,
      ancho: 2048,
      alto: 2048,
    });
  });

  it("2049x2048 se rechaza por el ancho", () => {
    expect(validarPng(pngDe({ ancho: 2049, alto: 2048 }))).toEqual({
      ok: false,
      motivo: "DIMENSIONES",
    });
  });

  it("la bomba: un archivo de 200 bytes que declara 20000x20000 se rechaza sin decodificar nada", () => {
    const bomba = new Uint8Array(200);
    bomba.set(pngDe({ ancho: 20000, alto: 20000 }), 0);

    expect(validarPng(bomba)).toEqual({ ok: false, motivo: "DIMENSIONES" });
  });
});
