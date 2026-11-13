import { describe, expect, it } from "vitest";
import {
  esquemaDeParametros,
  rutaDelAltaDeUsuario,
  rutaDeUsuarios,
} from "./destinoDeUsuarios";

/**
 * Los destinos de las tres acciones del panel: listado para restablecer y
 * baja, alta para su propio formulario. Igual que `rutaDelArbol` de
 * territorio, es una funcion pura para poder probar el destino sin
 * `redirect`, que es de Next y no nuestro.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";

describe("rutaDeUsuarios", () => {
  it("sin parametros es el listado pelado, sin un signo de mas", () => {
    expect(rutaDeUsuarios({})).toBe("/usuarios");
  });

  it("lleva el token de la clave mostrada y la confirmacion", () => {
    expect(rutaDeUsuarios({ clave: TOKEN, ok: "alta" })).toBe(
      `/usuarios?clave=${TOKEN}&ok=alta`,
    );
  });

  it("lleva el codigo de error, no el texto que se pinta", () => {
    expect(rutaDeUsuarios({ error: "no-encontrado" })).toBe(
      "/usuarios?error=no-encontrado",
    );
  });

  it("el orden de los parametros es el de la lista, no el de las llaves", () => {
    expect(rutaDeUsuarios({ error: "generico-baja", ok: "baja" })).toBe(
      "/usuarios?ok=baja&error=generico-baja",
    );
  });
});

describe("rutaDelAltaDeUsuario", () => {
  it("sin error es el formulario de alta", () => {
    expect(rutaDelAltaDeUsuario()).toBe("/usuarios/alta");
  });

  it("con error vuelve al formulario con el codigo", () => {
    expect(rutaDelAltaDeUsuario("sin-rol")).toBe(
      "/usuarios/alta?error=sin-rol",
    );
  });
});

describe("esquemaDeParametros", () => {
  it("acepta lo que escriben las acciones", () => {
    expect(
      esquemaDeParametros.parse({ clave: TOKEN, ok: "restablecimiento" }),
    ).toEqual({ clave: TOKEN, ok: "restablecimiento" });
  });

  it("descarta lo que no tiene forma en vez de romper la pantalla", () => {
    // `?clave=a&clave=b` llega como arreglo, `?ok=cualquiera` no es una
    // confirmacion y `?error=<lo que sea>` no es un codigo: la pantalla cae
    // al listado limpio en vez de un 500 o de pintar texto ajeno.
    expect(
      esquemaDeParametros.parse({
        clave: ["a", "b"],
        ok: "cualquiera",
        error: "<script>alert(1)</script>",
      }),
    ).toEqual({});
  });
});
