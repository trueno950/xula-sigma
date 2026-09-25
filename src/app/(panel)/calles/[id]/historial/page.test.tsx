import { beforeEach, describe, expect, it, vi } from "vitest";

const notFoundMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const leerHistorialDeCalleMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/historial-de-calle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/historial-de-calle")>()),
  leerHistorialDeCalle: leerHistorialDeCalleMock,
  LineaDeTiempoDeCalle: () => null,
}));

const { default: PaginaDeHistorialDeCalle } = await import("./page");
const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "u", rol: "CONSULTA" as const },
  origen: "web" as const,
};
const props = {
  params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }),
};

beforeEach(() => vi.clearAllMocks());

describe("PaginaDeHistorialDeCalle", () => {
  it("no consulta el historial sin sesion", async () => {
    contextoActualMock.mockResolvedValue(null);
    await expect(PaginaDeHistorialDeCalle(props)).resolves.toBeTruthy();
    expect(leerHistorialDeCalleMock).not.toHaveBeenCalled();
  });

  it("propaga un fallo operacional sin convertirlo en 404", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockRejectedValue(new Error("base no disponible"));

    await expect(PaginaDeHistorialDeCalle(props)).rejects.toThrow(
      "base no disponible",
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("convierte un id mal formado en 404 sin consultar el historial", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    const idMalFormado = { params: Promise.resolve({ id: "no-es-un-uuid" }) };

    await expect(PaginaDeHistorialDeCalle(idMalFormado)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(leerHistorialDeCalleMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("convierte una calle ajena o inexistente en 404", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(null);
    await expect(PaginaDeHistorialDeCalle(props)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(leerHistorialDeCalleMock).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      contexto,
    );
    expect(notFoundMock).toHaveBeenCalled();
  });
});
