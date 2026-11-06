import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const registrarReporteMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  registrarReporte: registrarReporteMock,
}));

const { altaDeReporteAction } = await import("./altaDeReporteAction");

const formDataDe = (campos: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

const ubicacionDomiciliaria = "11111111-1111-4111-8111-111111111111";
const lugarDeViaPublica = "22222222-2222-4222-8222-222222222222";
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
  registrarReporteMock.mockResolvedValue(
    "44444444-4444-4444-8444-444444444444",
  );
});

describe("altaDeReporteAction: la direccion elegida conserva su vinculo", () => {
  it("acepta domicilioId sin lugarId ni calleId y no envia calleId nulo", async () => {
    await expect(
      altaDeReporteAction(
        formDataDe({
          tipo: "BACHE",
          domicilioId: ubicacionDomiciliaria,
          descripcion: "Bache frente al parque principal",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    const entrada = vi.mocked(registrarReporteMock).mock.calls[0]?.[0];
    expect(entrada).toMatchObject({ domicilioId: ubicacionDomiciliaria });
    expect(entrada).not.toHaveProperty("lugarId");
    expect(entrada).not.toHaveProperty("calleId");
  });

  it("conserva el alta anterior por lugar/calle y su calle vacia como null", async () => {
    await expect(
      altaDeReporteAction(
        formDataDe({
          tipo: "BACHE",
          lugarId: lugarDeViaPublica,
          calleId: "",
          descripcion: "Bache frente al parque principal",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(registrarReporteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lugarId: lugarDeViaPublica,
        calleId: null,
      }),
      expect.anything(),
    );
    expect(
      vi.mocked(registrarReporteMock).mock.calls[0]?.[0],
    ).not.toHaveProperty("domicilioId");
  });
});
