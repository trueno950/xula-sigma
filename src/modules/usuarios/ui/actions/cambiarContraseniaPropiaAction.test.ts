import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaveDebilError, ClaveRepetidaError } from "@/shared/auth";

/**
 * El borde de S2: la accion no recibe el usuario de nadie —lo resuelve del
 * servidor con `contextoDeCambioDeClave`, que ademas exige que la cuenta
 * siga con la temporal puesta— y todo lo que viaja en la URL es un codigo.
 * La clave nunca sale de `FormData`.
 */

const contextoDeCambioMock = vi.hoisted(() => vi.fn());
const cambiarClaveMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  cambiarClavePropia: cambiarClaveMock,
  contextoDeCambioDeClave: contextoDeCambioMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { cambiarContraseniaPropiaAction } = await import(
  "./cambiarContraseniaPropiaAction"
);

const CONTEXTO = {
  ayuntamientoId: "motul",
  usuarioId: "usuario-1",
  sesionId: "sesion-1",
  origen: "https://motul.xulasigma.mx",
};

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  contextoDeCambioMock.mockResolvedValue(CONTEXTO);
  cambiarClaveMock.mockResolvedValue(undefined);
});

describe("cambiarContraseniaPropiaAction", () => {
  it("sin sesion que deba cambiar la clave manda al acceso", async () => {
    contextoDeCambioMock.mockResolvedValue(null);

    await expect(
      cambiarContraseniaPropiaAction(
        formulario({
          nueva: "clave-propia-larga",
          repetida: "clave-propia-larga",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/acceso");
    expect(cambiarClaveMock).not.toHaveBeenCalled();
  });

  it("las dos claves distintas no llegan al caso de uso", async () => {
    await expect(
      cambiarContraseniaPropiaAction(
        formulario({
          nueva: "clave-propia-larga",
          repetida: "otra-clave-larga",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/cambiar-contrasenia?error=no-coincide");
    expect(cambiarClaveMock).not.toHaveBeenCalled();
  });

  it("una clave corta vuelve con su codigo, nunca con el texto del error", async () => {
    cambiarClaveMock.mockRejectedValue(new ClaveDebilError());

    await expect(
      cambiarContraseniaPropiaAction(
        formulario({ nueva: "corta", repetida: "corta" }),
      ),
    ).rejects.toThrow("REDIRECT:/cambiar-contrasenia?error=corta");
    expect(destino()).not.toContain("caracteres");
  });

  it("repetir la temporal vuelve con el codigo de la repetida", async () => {
    cambiarClaveMock.mockRejectedValue(new ClaveRepetidaError());

    await expect(
      cambiarContraseniaPropiaAction(
        formulario({
          nueva: "temporal-larga-1",
          repetida: "temporal-larga-1",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/cambiar-contrasenia?error=repetida");
  });

  it("un fallo de infraestructura queda en el log y muestra el generico", async () => {
    cambiarClaveMock.mockRejectedValue(new Error("la base se cayo"));

    await expect(
      cambiarContraseniaPropiaAction(
        formulario({
          nueva: "clave-propia-larga",
          repetida: "clave-propia-larga",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/cambiar-contrasenia?error=generico");
    expect(destino()).not.toContain("la base se cayo");
    expect(console.error).toHaveBeenCalled();
  });

  it("al cambiar la clave sigue al panel y le pasa el contexto del servidor", async () => {
    await expect(
      cambiarContraseniaPropiaAction(
        formulario({
          nueva: "clave-propia-larga",
          repetida: "clave-propia-larga",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/");

    expect(cambiarClaveMock).toHaveBeenCalledWith(
      CONTEXTO,
      "clave-propia-larga",
    );
  });
});
