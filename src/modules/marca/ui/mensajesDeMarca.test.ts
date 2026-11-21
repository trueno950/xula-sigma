import { describe, expect, it } from "vitest";
import {
  CLAVES_DE_ERROR_DE_ESCUDO,
  CLAVES_DE_ERROR_DE_MARCA,
  esClaveDeErrorDeEscudo,
  leerParametrosDeMarca,
  MENSAJES_DE_ERROR_DE_ESCUDO,
  MENSAJES_DE_ERROR_DE_MARCA,
} from "./mensajesDeMarca";

/**
 * La lectura de los parametros de `/marca` (S4 y S9) y los dos catalogos que
 * viajan como codigo: el de la pagina (`?error=`) y el del archivo del escudo,
 * que se pinta junto al campo.
 *
 * Un vocabulario cerrado en los dos: lo que no esta en el catalogo no pinta
 * nada, y el texto que ve la operadora lo pone la pantalla, nunca la URL.
 */

describe("leerParametrosDeMarca", () => {
  it("la clave de confirmacion conocida viaja al aviso", () => {
    expect(leerParametrosDeMarca({ ok: "colores-guardados" })).toEqual({
      error: undefined,
      escudo: undefined,
      ok: "colores-guardados",
    });
  });

  it("una clave inventada no pinta ningun aviso", () => {
    expect(
      leerParametrosDeMarca({ ok: "colores-borrados" }).ok,
    ).toBeUndefined();
  });

  it("un codigo de error conocido llega a la pagina, que lo traduce (S4)", () => {
    expect(leerParametrosDeMarca({ error: "color-invalido" })).toEqual({
      error: "color-invalido",
      escudo: undefined,
      ok: undefined,
    });
    expect(
      leerParametrosDeMarca({ error: "restablecimiento-sin-confirmar" }).error,
    ).toBe("restablecimiento-sin-confirmar");
  });

  it("el texto que venga en la URL no se pinta: no es un codigo (S4)", () => {
    // El caso de la auditoria: `?error=Su cuenta será suspendida…` escribia
    // esa oracion en el aviso rojo del sistema, con la autoridad y la
    // tipografia de un mensaje propio.
    expect(
      leerParametrosDeMarca({
        error: "Su cuenta será suspendida en 24 horas.",
      }),
    ).toEqual({ error: undefined, escudo: undefined, ok: undefined });
  });

  it("el codigo del escudo llega como error del campo, no como aviso de la pagina", () => {
    expect(leerParametrosDeMarca({ error: "escudo-pesado" })).toEqual({
      error: undefined,
      escudo: "escudo-pesado",
      ok: undefined,
    });
  });

  it("un codigo de escudo inventado no es un error del campo", () => {
    expect(
      leerParametrosDeMarca({ error: "escudo-borrado" }).escudo,
    ).toBeUndefined();
  });

  it("un error y una confirmacion juntos: gana el error", () => {
    expect(
      leerParametrosDeMarca({ error: "escudo-vacio", ok: "colores-guardados" }),
    ).toEqual({ error: undefined, escudo: "escudo-vacio", ok: undefined });
    expect(
      leerParametrosDeMarca({ error: "sin-permiso", ok: "colores-guardados" }),
    ).toEqual({ error: "sin-permiso", escudo: undefined, ok: undefined });
  });

  it("sin parametros no hay nada que pintar", () => {
    expect(leerParametrosDeMarca({})).toEqual({
      error: undefined,
      escudo: undefined,
      ok: undefined,
    });
  });
});

describe("los dos catalogos de mensajes", () => {
  it("cada codigo de la pagina tiene su oracion, y ninguna se repite", () => {
    const oraciones = CLAVES_DE_ERROR_DE_MARCA.map(
      (clave) => MENSAJES_DE_ERROR_DE_MARCA[clave],
    );

    for (const oracion of oraciones) {
      expect(oracion.length).toBeGreaterThan(10);
      expect(oracion.endsWith(".")).toBe(true);
    }

    expect(new Set(oraciones).size).toBe(oraciones.length);
  });

  it("cada codigo del escudo tiene su oracion, y ninguna se repite", () => {
    const oraciones = CLAVES_DE_ERROR_DE_ESCUDO.map(
      (clave) => MENSAJES_DE_ERROR_DE_ESCUDO[clave],
    );

    for (const oracion of oraciones) {
      expect(oracion.length).toBeGreaterThan(10);
      expect(oracion.endsWith(".")).toBe(true);
    }

    expect(new Set(oraciones).size).toBe(oraciones.length);
  });

  it("solo los codigos del catalogo son codigos del escudo", () => {
    expect(esClaveDeErrorDeEscudo("escudo-no-png")).toBe(true);
    expect(esClaveDeErrorDeEscudo("escudo-inventado")).toBe(false);
    expect(esClaveDeErrorDeEscudo("colores-guardados")).toBe(false);
  });
});
