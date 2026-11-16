import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

/**
 * Lo que el formulario NO decide (S2 y S6): el municipio sale del contexto
 * del servidor y el texto sobre el primario lo calcula el caso de uso. Un
 * cliente puede mandar los dos campos igual, y estos tests fijan que la
 * accion los descarta antes de llegar a `cambiarColores`.
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const cambiarColoresMock = vi.fn();
const redirigirMock = vi.fn((ruta: string) => {
  throw new Error(`REDIRECT:${ruta}`);
});

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({ cambiarColores: cambiarColoresMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirigirMock }));

const { cambiarColoresAction } = await import("./cambiarColoresAction");

const MOTUL = "e2e00000-0000-4000-8000-000000000001";
const TICUL = "e2e00000-0000-4000-8000-000000000002";

const contexto: ContextoActual = {
  ayuntamientoId: MOTUL as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const formulario = (campos: Record<string, string>): FormData => {
  const formData = new FormData();

  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }

  return formData;
};

describe("cambiarColoresAction: campos que el cliente no decide", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    cambiarColoresMock.mockReset();
    contextoActualMock.mockResolvedValue(contexto);
    cambiarColoresMock.mockResolvedValue({});
  });

  it("un ayuntamientoId del formulario no reemplaza al del contexto", async () => {
    await expect(
      cambiarColoresAction(
        formulario({
          primario: "#ffd700",
          secundario: "#ffd700",
          ayuntamientoId: TICUL,
        }),
      ),
    ).rejects.toThrow("REDIRECT");

    expect(cambiarColoresMock).toHaveBeenCalledWith(
      { primario: "#ffd700", secundario: "#ffd700" },
      contexto,
    );
    expect(JSON.stringify(cambiarColoresMock.mock.calls)).not.toContain(TICUL);
  });

  it("un primarioTexto del formulario no llega al caso de uso", async () => {
    await expect(
      cambiarColoresAction(
        formulario({
          primario: "#ffd700",
          secundario: "#ffd700",
          primarioTexto: "#000000",
        }),
      ),
    ).rejects.toThrow("REDIRECT");

    const [entrada] = cambiarColoresMock.mock.calls[0] ?? [];

    expect(entrada).toEqual({ primario: "#ffd700", secundario: "#ffd700" });
  });
});
