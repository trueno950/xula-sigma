import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import {
  CLAVES_DE_ERROR_DE_ESCUDO,
  MENSAJES_DE_ERROR_DE_ESCUDO,
} from "../mensajesDeMarca";

/**
 * El borde de `cambiarEscudoAction` (S6, S8 y S9).
 *
 * Desde E1 la accion es el `action` de un `<form>` nativo y multipart, asi
 * que no devuelve `ActionResult<T>` que solo un componente cliente podria
 * leer: el rechazo viaja como **codigo** en la URL y la pantalla lo traduce
 * con las oraciones de `mensajesDeMarca.ts`. Lo que se fija aca es que cada
 * rechazo llega con su codigo —nunca con el texto de la excepcion— y que
 * ninguno llama al caso de uso.
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const cambiarEscudoMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirigirMock = vi.fn((ruta: string): never => {
  throw new Error(`REDIRECT:${ruta}`);
});

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({ cambiarEscudo: cambiarEscudoMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: redirigirMock }));

const { cambiarEscudoAction } = await import("./cambiarEscudo.action");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

/** 80x80 con firma PNG e `IHDR` completos: lo minimo que `validarPng` acepta. */
const pngValido = (lado = 80) => {
  const bytes = new Uint8Array(33);

  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  bytes.set([0, 0, lado >> 8, lado & 0xff], 16);
  bytes.set([0, 0, lado >> 8, lado & 0xff], 20);

  return bytes;
};

const archivo = (bytes = pngValido()): File =>
  new File([bytes], "escudo.png", { type: "image/png" });

const formulario = (contenido?: File): FormData => {
  const formData = new FormData();

  if (contenido) formData.set("escudo", contenido);

  return formData;
};

const destinoDelRedirect = (): URL => {
  const [ruta] = redirigirMock.mock.calls.at(-1) ?? [""];

  return new URL(ruta, "http://motul.xula.localhost");
};

const codigoDelError = (): string | null =>
  destinoDelRedirect().searchParams.get("error");

const ejecutar = async (contenido?: File): Promise<void> => {
  await expect(cambiarEscudoAction(formulario(contenido))).rejects.toThrow(
    "REDIRECT",
  );
};

describe("cambiarEscudoAction", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    cambiarEscudoMock.mockReset();
    revalidatePathMock.mockReset();
    redirigirMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sin sesion manda al acceso y no llama al caso de uso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await ejecutar(archivo());

    expect(destinoDelRedirect().pathname).toBe("/acceso");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("sin archivo responde el codigo del campo escudo y no sube nada", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar();

    expect(codigoDelError()).toBe("escudo-archivo-faltante");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("un archivo vacio responde `escudo-vacio`", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar(archivo(new Uint8Array(0)));

    expect(codigoDelError()).toBe("escudo-vacio");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("un archivo de mas de 1 MiB responde `escudo-pesado`", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    // El sniffer mira el tamano antes que la firma: los bytes no importan.
    await ejecutar(archivo(new Uint8Array(1024 * 1024 + 1)));

    expect(codigoDelError()).toBe("escudo-pesado");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("un archivo que no es PNG responde `escudo-no-png`", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar(archivo(new Uint8Array([1, 2, 3])));

    expect(codigoDelError()).toBe("escudo-no-png");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("un PNG fuera de las dimensiones admitidas responde `escudo-dimensiones`", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar(archivo(pngValido(20)));

    expect(codigoDelError()).toBe("escudo-dimensiones");
    expect(cambiarEscudoMock).not.toHaveBeenCalled();
  });

  it("con sesion y archivo valido sube los bytes, revalida y confirma", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarEscudoMock.mockResolvedValue({
      escudo: "https://assets.xulasigma.mx/motul/escudo-x.png",
    });

    await ejecutar(archivo());

    expect(cambiarEscudoMock).toHaveBeenCalledWith(
      { bytes: expect.any(Uint8Array) },
      contexto,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/marca");
    expect(revalidatePathMock).toHaveBeenCalledWith("/acceso");
    expect(destinoDelRedirect().searchParams.get("ok")).toBe(
      "escudo-actualizado",
    );
  });

  it("un rol sin permiso responde `escudo-sin-permiso`", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarEscudoMock.mockRejectedValue(new NoAutorizadoError());

    await ejecutar(archivo());

    expect(codigoDelError()).toBe("escudo-sin-permiso");
  });

  it("un rechazo con mensaje propio sale como codigo, nunca como el texto de la excepcion", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    cambiarEscudoMock.mockRejectedValue(
      new ValidacionError({ escudo: "synthetic-personal-data-canary" }, "x"),
    );
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await ejecutar(archivo());

      const codigo = codigoDelError();

      expect(codigo).toBe("escudo-no-guardado");
      expect(CLAVES_DE_ERROR_DE_ESCUDO).toContain(codigo);
      expect(destinoDelRedirect().search).not.toContain("synthetic");
      expect(registro).toHaveBeenCalled();
      expect(MENSAJES_DE_ERROR_DE_ESCUDO["escudo-no-guardado"]).toBe(
        "No se pudo subir el archivo. Intente de nuevo.",
      );
    } finally {
      registro.mockRestore();
    }
  });
});
