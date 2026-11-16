"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoAutorizadoError } from "@/shared/lib/errores";

/**
 * La Server Action del umbral, invocada directo: el formulario nativo de
 * `AGENTS.md` (seccion Server Actions) viaja por `redirect` + `?error=`, y
 * lo que se prueba aca es el borde de sesion, no el navegador. Esconder el
 * formulario al rol que no administra no es autorizacion: la guarda real
 * vive en `cambiarUmbralDeAtraso`.
 */
const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const cambiarUmbralDeAtrasoMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  cambiarUmbralDeAtraso: cambiarUmbralDeAtrasoMock,
}));

const { cambiarUmbralDeAtrasoAction } = await import(
  "./cambiarUmbralDeAtrasoAction"
);

const formDataDe = (campos: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

const destino = () => redirectMock.mock.calls[0]?.[0] as string;

beforeEach(() => {
  vi.clearAllMocks();
  // `clearAllMocks` no borra implementaciones: sin este reset, el
  // `mockRejectedValue` de un caso dejaria a los siguientes sin poder guardar.
  cambiarUmbralDeAtrasoMock.mockReset();
  redirectMock.mockImplementation((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
});

describe("cambiarUmbralDeAtrasoAction", () => {
  it.each(["0", "91", "siete", ""])(
    "un valor %s no llega al caso de uso y vuelve con un mensaje de operadora",
    async (dias) => {
      await expect(
        cambiarUmbralDeAtrasoAction(formDataDe({ diasDeAtraso: dias })),
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(cambiarUmbralDeAtrasoMock).not.toHaveBeenCalled();
      expect(destino()).toContain("/reportes/configuracion?error=");
      expect(decodeURIComponent(destino())).toContain(
        "El umbral va de 1 a 90 días.",
      );
    },
  );

  it("un rol sin permiso no guarda y lee el mensaje del caso de uso", async () => {
    cambiarUmbralDeAtrasoMock.mockRejectedValue(
      new NoAutorizadoError("Su rol no puede configurar los reportes."),
    );

    await expect(
      cambiarUmbralDeAtrasoAction(formDataDe({ diasDeAtraso: "15" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(decodeURIComponent(destino())).toContain(
      "Su rol no puede configurar los reportes.",
    );
  });

  it("un ayuntamientoId en el formulario no viaja al caso de uso", async () => {
    await expect(
      cambiarUmbralDeAtrasoAction(
        formDataDe({
          diasDeAtraso: "15",
          ayuntamientoId: "11111111-1111-4111-8111-111111111111",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarUmbralDeAtrasoMock).toHaveBeenCalledWith(15, {
      ayuntamientoId: "motul",
      usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
      origen: "web",
    });
  });

  it("al guardar vuelve al formulario con la pantalla revalidada", async () => {
    await expect(
      cambiarUmbralDeAtrasoAction(formDataDe({ diasDeAtraso: "15" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(revalidatePathMock).toHaveBeenCalledWith("/reportes/configuracion");
    expect(revalidatePathMock).toHaveBeenCalledWith("/reportes");
    expect(destino()).toBe("/reportes/configuracion");
  });

  it("sin sesion manda al acceso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(
      cambiarUmbralDeAtrasoAction(formDataDe({ diasDeAtraso: "15" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(destino()).toBe("/acceso");
  });
});
