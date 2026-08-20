import { describe, expect, it, vi } from "vitest";
import {
  mapearError,
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "./errores";

/**
 * `mapearError` despacha por `codigo`, nunca por `instanceof` — es la razon
 * de que exista `ActionResult`: un error que cruza un limite de modulo o se
 * serializa hacia una Server Action pierde su prototipo (ver el
 * encabezado de `errores.ts`). Los cinco casos son los cuatro `codigo` que
 * ya declara el archivo mas el `ERROR_INTERNO` de cualquier otra cosa.
 */
describe("mapearError", () => {
  it("NoAutorizadoError mapea a NO_AUTORIZADO", () => {
    const resultado = mapearError(new NoAutorizadoError());

    expect(resultado).toEqual({
      ok: false,
      codigo: "NO_AUTORIZADO",
      mensaje: expect.any(String),
    });
  });

  it("NoEncontradoError mapea a NO_ENCONTRADO", () => {
    const resultado = mapearError(new NoEncontradoError());

    expect(resultado).toEqual({
      ok: false,
      codigo: "NO_ENCONTRADO",
      mensaje: expect.any(String),
    });
  });

  it("ValidacionError mapea a VALIDACION y conserva los campos", () => {
    const resultado = mapearError(
      new ValidacionError({ escudo: "El archivo no es un PNG valido." }),
    );

    expect(resultado).toEqual({
      ok: false,
      codigo: "VALIDACION",
      mensaje: expect.any(String),
      campos: { escudo: "El archivo no es un PNG valido." },
    });
  });

  it("TenantNoResueltoError mapea a TENANT_NO_RESUELTO", () => {
    const resultado = mapearError(new TenantNoResueltoError());

    expect(resultado).toEqual({
      ok: false,
      codigo: "TENANT_NO_RESUELTO",
      mensaje: expect.any(String),
    });
  });

  it("un error sin codigo conocido mapea a ERROR_INTERNO sin filtrar el mensaje original", () => {
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultado = mapearError(
      new Error("falta la variable de entorno R2_BUCKET"),
    );

    expect(resultado.ok).toBe(false);
    expect(resultado).toMatchObject({ codigo: "ERROR_INTERNO" });
    if (!resultado.ok) {
      expect(resultado.mensaje).not.toContain("R2_BUCKET");
    }

    espia.mockRestore();
  });

  it("despacha por codigo y no por instanceof", () => {
    /**
     * Un objeto plano con `codigo` pero sin pasar por `new
     * NoAutorizadoError(...)`. Es exactamente lo que llega cuando el error
     * cruzo un limite de serializacion y perdio el prototipo: si
     * `mapearError` usara `instanceof`, este caso caeria en `ERROR_INTERNO`.
     */
    const sinPrototipo = { codigo: "NO_AUTORIZADO", message: "sin permiso" };

    expect(mapearError(sinPrototipo)).toEqual({
      ok: false,
      codigo: "NO_AUTORIZADO",
      mensaje: expect.any(String),
    });
  });
});
