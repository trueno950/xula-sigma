import { describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/shared/lib/errores";
import type { EscudoCambiado } from "../types";
import { MENSAJE_DE_SUBIDA_FALLIDA, subirEscudo } from "./subirEscudo";

const archivo = new File([new Uint8Array(3)], "escudo.png", {
  type: "image/png",
});

const accionQueDevuelve = (resultado: ActionResult<EscudoCambiado>) =>
  vi.fn(async (_formData: FormData) => resultado);

describe("subirEscudo", () => {
  it("manda el archivo con el nombre de campo que la accion lee", async () => {
    const accion = accionQueDevuelve({
      ok: true,
      data: { escudo: "https://cdn.example.com/e.png" },
    });

    await subirEscudo(archivo, accion);

    expect(accion.mock.calls[0]?.[0].get("escudo")).toBe(archivo);
  });

  it("un resultado exitoso queda como ok", async () => {
    const accion = accionQueDevuelve({
      ok: true,
      data: { escudo: "https://cdn.example.com/e.png" },
    });

    await expect(subirEscudo(archivo, accion)).resolves.toEqual({ ok: true });
  });

  it("un rechazo de validacion muestra el mensaje del campo escudo", async () => {
    const accion = accionQueDevuelve({
      ok: false,
      codigo: "VALIDACION",
      mensaje: "Datos invalidos.",
      campos: { escudo: "El archivo pesa mas de 1 MiB." },
    });

    await expect(subirEscudo(archivo, accion)).resolves.toEqual({
      ok: false,
      mensaje: "El archivo pesa mas de 1 MiB.",
    });
  });

  it("un rechazo sin campo muestra el mensaje general, por ejemplo el de permiso", async () => {
    const accion = accionQueDevuelve({
      ok: false,
      codigo: "NO_AUTORIZADO",
      mensaje: "No tiene permiso para esta accion.",
    });

    await expect(subirEscudo(archivo, accion)).resolves.toEqual({
      ok: false,
      mensaje: "No tiene permiso para esta accion.",
    });
  });

  it.each([
    ["un Error", new Error("Body exceeded 1 MB limit.")],
    ["un valor que no es Error", "fallo"],
  ])(
    "una promesa rechazada con %s no se propaga: da el mensaje generico",
    async (_nombre, fallo) => {
      const accion = vi.fn(async (_formData: FormData) => {
        throw fallo;
      });

      await expect(subirEscudo(archivo, accion)).resolves.toEqual({
        ok: false,
        mensaje: MENSAJE_DE_SUBIDA_FALLIDA,
      });
      expect(MENSAJE_DE_SUBIDA_FALLIDA).toBe(
        "No se pudo subir el archivo. Intente de nuevo.",
      );
    },
  );

  it("registra solo el nombre de un error rechazado", async () => {
    const error = new Error(
      "synthetic-file-canary.png synthetic-personal-data-canary",
    );
    error.name = "ErrorDeTransporte";
    const accion = vi.fn(async (_formData: FormData) => {
      throw error;
    });
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(subirEscudo(archivo, accion)).resolves.toEqual({
        ok: false,
        mensaje: MENSAJE_DE_SUBIDA_FALLIDA,
      });
      expect(registro.mock.calls).toEqual([
        ["Fallo al subir el escudo", "ErrorDeTransporte"],
      ]);
    } finally {
      registro.mockRestore();
    }
  });

  it("registra solo el tipo de un rechazo que no es Error", async () => {
    const accion = vi.fn(async (_formData: FormData) => {
      throw { message: "synthetic-personal-data-canary" };
    });
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(subirEscudo(archivo, accion)).resolves.toEqual({
        ok: false,
        mensaje: MENSAJE_DE_SUBIDA_FALLIDA,
      });
      expect(registro.mock.calls).toEqual([
        ["Fallo al subir el escudo", "object"],
      ]);
    } finally {
      registro.mockRestore();
    }
  });
});
