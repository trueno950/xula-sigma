import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const buscarDireccionesParaReporteMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  buscarDireccionesParaReporte: buscarDireccionesParaReporteMock,
}));

const { buscarDireccionesAction } = await import("./buscarDireccionesAction");

const resultadoDePrueba = {
  opciones: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      etiqueta: "Calle 20 #42-B, Colonia Centro, Buenavista",
      lugarId: "22222222-2222-4222-8222-222222222222",
    },
  ],
  hayMas: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "usuario-1", rol: "OPERADOR" },
    origen: "web",
  });
  buscarDireccionesParaReporteMock.mockResolvedValue(resultadoDePrueba);
});

describe("buscarDireccionesAction", () => {
  it("valida primero y no consulta para una busqueda corta", async () => {
    const resultado = await buscarDireccionesAction({ consulta: " a " });

    expect(resultado).toMatchObject({ ok: false, codigo: "VALIDACION" });
    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(buscarDireccionesParaReporteMock).not.toHaveBeenCalled();
  });

  it("rechaza 121 caracteres antes de resolver el tenant", async () => {
    const resultado = await buscarDireccionesAction({
      consulta: "a".repeat(121),
    });

    expect(resultado).toMatchObject({ ok: false, codigo: "VALIDACION" });
    expect(contextoActualMock).not.toHaveBeenCalled();
    expect(buscarDireccionesParaReporteMock).not.toHaveBeenCalled();
  });

  it("acepta el limite de 120 caracteres", async () => {
    const consulta = "a".repeat(120);
    const resultado = await buscarDireccionesAction({ consulta });

    expect(resultado).toEqual({ ok: true, data: resultadoDePrueba });
    expect(buscarDireccionesParaReporteMock).toHaveBeenCalledWith(
      consulta,
      expect.anything(),
    );
  });

  it("busca con el contexto autenticado y devuelve solo opciones seguras para la interfaz", async () => {
    const contexto = await contextoActualMock();
    const resultado = await buscarDireccionesAction({ consulta: " Calle 20 " });

    expect(buscarDireccionesParaReporteMock).toHaveBeenCalledWith(
      "Calle 20",
      contexto,
    );
    expect(resultado).toEqual({ ok: true, data: resultadoDePrueba });
  });

  it("rechaza una sesion ausente sin consultar direcciones", async () => {
    contextoActualMock.mockResolvedValue(null);

    const resultado = await buscarDireccionesAction({ consulta: "Calle 20" });

    expect(resultado).toMatchObject({ ok: false, codigo: "NO_AUTORIZADO" });
    expect(buscarDireccionesParaReporteMock).not.toHaveBeenCalled();
  });
});
