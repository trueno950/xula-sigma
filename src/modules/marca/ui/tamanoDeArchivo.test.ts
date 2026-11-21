import { describe, expect, it } from "vitest";
import { MENSAJES_DE_ERROR_DE_ESCUDO } from "./mensajesDeMarca";
import { archivoDemasiadoGrande } from "./tamanoDeArchivo";

/**
 * El tope lo pone `domain/png.ts`, no este archivo: lo que se fija aca es que
 * la pantalla use **el mismo** umbral que la accion, para que un archivo
 * rechazado en el navegador y uno rechazado en el servidor den la misma
 * oracion.
 */

const UN_MIB = 1024 * 1024;

describe("archivoDemasiadoGrande", () => {
  it("un archivo que entra en 1 MiB pasa", () => {
    expect(archivoDemasiadoGrande({ size: UN_MIB })).toBeUndefined();
    expect(archivoDemasiadoGrande({ size: 0 })).toBeUndefined();
  });

  it("un byte de mas ya lo rechaza, con la misma oracion que el servidor", () => {
    expect(archivoDemasiadoGrande({ size: UN_MIB + 1 })).toBe(
      MENSAJES_DE_ERROR_DE_ESCUDO["escudo-pesado"],
    );
    expect(MENSAJES_DE_ERROR_DE_ESCUDO["escudo-pesado"]).toBe(
      "El archivo pesa más de 1 MiB.",
    );
  });

  it("un archivo de varios MiB, que el transporte ni siquiera admitiria, tambien", () => {
    expect(archivoDemasiadoGrande({ size: 5 * UN_MIB })).toBe(
      MENSAJES_DE_ERROR_DE_ESCUDO["escudo-pesado"],
    );
  });

  it("sin archivo elegido no hay nada que decir", () => {
    expect(archivoDemasiadoGrande(undefined)).toBeUndefined();
  });
});
