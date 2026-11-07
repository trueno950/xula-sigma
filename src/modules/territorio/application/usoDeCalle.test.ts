import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId } from "../domain";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearUsoDeCalle } = await import("./usoDeCalle");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};
const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");

describe("usoDeCalle", () => {
  const tx = { soy: "tx" };
  const repositorio = {
    contarDomiciliosQueLaUsan: vi.fn(),
    contarZonasQueLaUsan: vi.fn(),
    contarZonasActivasQueLaUsan: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo(tx),
    );
  });

  it("cuenta domicilios, zonas y zonas activas de la calle dentro del tenant del contexto", async () => {
    repositorio.contarDomiciliosQueLaUsan.mockResolvedValue(4);
    repositorio.contarZonasQueLaUsan.mockResolvedValue(2);
    repositorio.contarZonasActivasQueLaUsan.mockResolvedValue(1);

    const uso = await crearUsoDeCalle(repositorio)(calleId, contexto);

    expect(uso).toEqual({ domicilios: 4, zonas: 2, zonasActivas: 1 });
    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.contarDomiciliosQueLaUsan).toHaveBeenCalledWith(
      tx,
      calleId,
    );
    expect(repositorio.contarZonasQueLaUsan).toHaveBeenCalledWith(tx, calleId);
    expect(repositorio.contarZonasActivasQueLaUsan).toHaveBeenCalledWith(
      tx,
      calleId,
    );
  });
});
