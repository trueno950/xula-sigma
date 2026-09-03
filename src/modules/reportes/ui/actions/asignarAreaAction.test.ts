import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoAutorizadoError } from "@/shared/lib/errores";

/**
 * Mismo criterio que `cambiarEstadoAction.test.ts` (tasks.md 7.13): ocultar
 * el boton de "Asignar area" en `AccionesDeReporte` no es autorizacion, la
 * guarda real vive en `asignarAreaDeReporte` (Fase 5).
 */
const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const asignarAreaDeReporteMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  asignarAreaDeReporte: asignarAreaDeReporteMock,
}));

const { asignarAreaAction } = await import("./asignarAreaAction");

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

describe("asignarAreaAction: el boton oculto no reemplaza la guarda", () => {
  it("un rol sin permiso llega igual al caso de uso, que rechaza con NoAutorizadoError", async () => {
    asignarAreaDeReporteMock.mockRejectedValue(new NoAutorizadoError());

    await expect(
      asignarAreaAction(
        formDataDe({ id: REPORTE_ID, areaResponsable: "OBRAS_PUBLICAS" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(asignarAreaDeReporteMock).toHaveBeenCalled();
    const destino = redirectMock.mock.calls[0]?.[0] as string;
    expect(destino).toContain(`/reportes/detalle/${REPORTE_ID}`);
    expect(destino).toContain("error=");
  });
});
