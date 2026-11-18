import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { PersonaId } from "../domain";
import type { LectorDeIdentidadesEnLote } from "./identidadesDePersonas";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearIdentidadesDePersonas } = await import("./identidadesDePersonas");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("identidadesDePersonas", () => {
  const lector: LectorDeIdentidadesEnLote = { deVarias: vi.fn() };
  const identidadesDePersonas = crearIdentidadesDePersonas(lector);

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("sin ids devuelve un mapa vacio sin abrir withTenant", async () => {
    const grupos = await identidadesDePersonas([], contexto);

    expect(grupos.size).toBe(0);
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("lee todas las identidades de la pagina en una sola transaccion del tenant", async () => {
    const esperado = new Map([
      ["ganadora" as PersonaId, ["ganadora", "perdedora"] as PersonaId[]],
    ]);
    vi.mocked(lector.deVarias).mockResolvedValue(esperado);

    const ids = ["ganadora", "sola"] as PersonaId[];
    const grupos = await identidadesDePersonas(ids, contexto);

    expect(grupos).toBe(esperado);
    expect(withTenantMock).toHaveBeenCalledTimes(1);
    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(lector.deVarias).toHaveBeenCalledWith({}, ids);
  });
});
