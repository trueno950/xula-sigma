import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoAutorizadoError } from "@/shared/lib/errores";

/**
 * `AccionesDeReporte` oculta cada boton de transicion si
 * `!puedeAdministrarReportes(rol)`, pero ocultar un boton no es
 * autorizacion (design.md seccion 15, tasks.md 7.13). Este test invoca la
 * Server Action directamente, sin pasar por la UI que la esconderia: la
 * guarda real vive en `cambiarEstadoDeReporte` (Fase 5), y sigue siendo
 * ella quien rechaza.
 */
const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const cambiarEstadoDeReporteMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  cambiarEstadoDeReporte: cambiarEstadoDeReporteMock,
}));

const { cambiarEstadoAction } = await import("./cambiarEstadoAction");

const REPORTE_ID = "11111111-1111-4111-8111-111111111111";

const formDataDe = (campos: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "usuario-1", rol: "OPERADOR" },
    origen: "web",
  });
});

describe("cambiarEstadoAction: el boton oculto no reemplaza la guarda", () => {
  it("un rol sin permiso llega igual al caso de uso, que rechaza con NoAutorizadoError", async () => {
    cambiarEstadoDeReporteMock.mockRejectedValue(new NoAutorizadoError());

    await expect(
      cambiarEstadoAction(
        formDataDe({ id: REPORTE_ID, estadoNuevo: "EN_ATENCION" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoDeReporteMock).toHaveBeenCalled();
    const destino = redirectMock.mock.calls[0]?.[0] as string;
    expect(destino).toContain(`/reportes/detalle/${REPORTE_ID}`);
    expect(destino).toContain("error=");
  });
});
