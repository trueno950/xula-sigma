import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";

const contextoActualMock = vi.hoisted(() => vi.fn());
const cambiarEstadoMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  cambiarEstadoDeReporte: cambiarEstadoMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));

const { cambiarEstadoAction } = await import("./cambiarEstadoAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const ID = "11111111-1111-4111-8111-111111111111";

const rechazo = (campos: Record<string, string> = {}) => {
  const formData = new FormData();
  formData.set("id", ID);
  formData.set("estadoNuevo", "RECHAZADO");
  formData.set("motivoDeRechazo", "DUPLICADO");
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

describe("cambiarEstadoAction, rechazo por duplicado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(contexto);
    cambiarEstadoMock.mockResolvedValue(undefined);
  });

  it("acepta el folio del original tal como lo ve el operador", async () => {
    await expect(
      cambiarEstadoAction(rechazo({ folioDelOriginal: "REP-2026-000003" })),
    ).rejects.toThrow(`REDIRECT:/reportes/detalle/${ID}`);

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      expect.objectContaining({ folioDelOriginal: "REP-2026-000003" }),
      contexto,
    );
  });

  it("normaliza espacios y minusculas del folio tecleado", async () => {
    await expect(
      cambiarEstadoAction(rechazo({ folioDelOriginal: " rep-2026-000003 " })),
    ).rejects.toThrow("REDIRECT:");

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      expect.objectContaining({ folioDelOriginal: "REP-2026-000003" }),
      contexto,
    );
  });

  it("un UUID ya no es un folio: dice que falta el folio y no llama al caso de uso", async () => {
    await expect(
      cambiarEstadoAction(rechazo({ folioDelOriginal: ID })),
    ).rejects.toThrow(
      `error=${encodeURIComponent("El folio del reporte original debe tener la forma REP-2026-000123.")}`,
    );

    expect(cambiarEstadoMock).not.toHaveBeenCalled();
  });

  it("un folio inexistente y uno de otro municipio salen con el mismo mensaje", async () => {
    cambiarEstadoMock.mockRejectedValue(new NoEncontradoError());

    await expect(
      cambiarEstadoAction(rechazo({ folioDelOriginal: "REP-2026-000999" })),
    ).rejects.toThrow(`error=${encodeURIComponent("Ese reporte no existe.")}`);
  });

  it("sin folio el caso de uso recibe null y decide", async () => {
    await expect(cambiarEstadoAction(rechazo())).rejects.toThrow("REDIRECT:");

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      expect.objectContaining({ folioDelOriginal: null }),
      contexto,
    );
  });
});
