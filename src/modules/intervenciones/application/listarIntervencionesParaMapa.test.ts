import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoIntervencionId } from "../domain";
import type { LectorDeIntervencionesDeMapa } from "./puertosDeLectura";

const withTenantMock = vi.hoisted(() => vi.fn());
vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarIntervencionesParaMapa", () => {
  const lector: LectorDeIntervencionesDeMapa = { listarParaMapa: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lector.listarParaMapa).mockResolvedValue([
      {
        id: comoIntervencionId("11111111-1111-4111-8111-111111111111"),
        tipo: "OBRA",
        estado: "PLANIFICADA",
        calleId: null,
        lugarId: "lugar-1",
      },
    ]);
  });

  it("conserva una intervencion sin calle y fija el tenant desde el contexto", async () => {
    const { crearListarIntervencionesParaMapa } = await import(
      "./listarIntervencionesParaMapa"
    );
    const filas = await crearListarIntervencionesParaMapa(lector)(contexto);

    expect(filas).toEqual([
      expect.objectContaining({ calleId: null, tipo: "OBRA" }),
    ]);
    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(lector.listarParaMapa).toHaveBeenCalledWith({});
  });
});
