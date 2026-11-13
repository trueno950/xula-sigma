import { describe, expect, it } from "vitest";
import { crc32 } from "./crc32";

/**
 * Los valores conocidos del CRC-32/ISO-HDLC —el que usa el ZIP— sacados del
 * apendice del RFC 1952. Sin estos ancla, un escritor de ZIP puede producir
 * bytes que `unzip` acepta en la prueba de integridad y aun asi no
 * corresponde con el contenido; el chequeo se vuelve circular.
 */
const bytes = (texto: string): Uint8Array => new TextEncoder().encode(texto);

describe("crc32", () => {
  it("la cadena vacia da 0, el valor inicial", () => {
    expect(crc32(bytes(""))).toBe(0);
  });

  it("123456789 da 0xCBF43926, el valor de prueba de RFC 1952", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
  });

  it("The quick brown fox... da 0x414FA339", () => {
    expect(crc32(bytes("The quick brown fox jumps over the lazy dog"))).toBe(
      0x414fa339,
    );
  });

  it("un byte en cero no da cero: distingue el vacio del contenido", () => {
    expect(crc32(new Uint8Array([0]))).toBe(0xd202ef8d);
  });

  it("devuelve un entero sin signo de 32 bits", () => {
    expect(crc32(bytes("ñandú,José"))).toBeGreaterThanOrEqual(0);
    expect(crc32(bytes("ñandú,José"))).toBeLessThanOrEqual(0xffffffff);
  });
});
