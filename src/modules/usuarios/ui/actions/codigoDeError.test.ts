import { afterEach, describe, expect, it, vi } from "vitest";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { CorreoYaRegistradoError, RolNoAsignableError } from "../../domain";
import { codigoDeErrorParaLaOperadora } from "./codigoDeError";

/**
 * La lista blanca que traduce el error a un codigo —el codigo viaja en la
 * URL, el mensaje lo pone la pantalla—. Lo que se prueba: los errores de
 * negocio tienen codigo propio, y **todo lo demas cae en el generico con su
 * traza en el log**: un error de Postgres tambien es `Error` y su `.message`
 * no esta redactado para nadie.
 */

afterEach(() => vi.restoreAllMocks());

describe("codigoDeErrorParaLaOperadora", () => {
  it.each([
    ["sin permiso", new NoAutorizadoError(), "sin-permiso"],
    ["no encontrado", new NoEncontradoError(), "no-encontrado"],
    ["rol no asignable", new RolNoAsignableError(), "rol-no-asignable"],
    ["correo repetido", new CorreoYaRegistradoError(), "correo-ya-registrado"],
  ])("traduce el error de %s", (_caso, error, codigo) => {
    expect(codigoDeErrorParaLaOperadora(error, "alta", "generico-alta")).toBe(
      codigo,
    );
  });

  it("un error de base cae en el generico de la accion y deja su traza", () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      { code: "23505" },
    );

    expect(codigoDeErrorParaLaOperadora(error, "baja", "generico-baja")).toBe(
      "generico-baja",
    );
    expect(registro).toHaveBeenCalledWith(
      "[usuarios] baja fallo",
      expect.objectContaining({}),
    );
  });

  it("tampoco deja pasar un valor que ni siquiera es un error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      codigoDeErrorParaLaOperadora("se rompio", "alta", "generico-alta"),
    ).toBe("generico-alta");
  });
});
