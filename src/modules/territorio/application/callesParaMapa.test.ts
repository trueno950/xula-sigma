import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoLugarId } from "../domain";
import type { CalleGuardada } from "./puertos";
import type { LectorDeCallesDeMapa } from "./puertosDeLecturaDeCalles";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearCallesParaMapa } = await import("./callesParaMapa");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const calleSinPunto: CalleGuardada = {
  id: comoCalleId("11111111-1111-4111-8111-111111111111"),
  nombre: "Calle 20",
  lugarId: comoLugarId("22222222-2222-4222-8222-222222222222"),
  punto: null,
  bajaEn: new Date("2026-01-02T00:00:00.000Z"),
};

describe("callesParaMapa", () => {
  const lector: LectorDeCallesDeMapa = {
    listarParaMapa: vi.fn(),
    leerConEventos: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lector.listarParaMapa).mockResolvedValue([calleSinPunto]);
  });

  it("conserva el punto nulo y la baja logica sin inventar coordenadas", async () => {
    const calles = await crearCallesParaMapa(lector)(contextoCon("OPERADOR"));

    expect(calles).toEqual([calleSinPunto]);
    expect(calles[0]?.punto).toBeNull();
    expect(calles[0]?.bajaEn).toEqual(calleSinPunto.bajaEn);
  });

  it("fija el tenant desde el contexto del servidor, no de la entrada", async () => {
    await crearCallesParaMapa(lector)(contextoCon("ADMIN_MUNICIPAL"));

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(lector.listarParaMapa).toHaveBeenCalledWith({});
  });

  it("no exige puedeAdministrarTerritorio: un OPERADOR puede leer el mapa", async () => {
    await expect(
      crearCallesParaMapa(lector)(contextoCon("OPERADOR")),
    ).resolves.toHaveLength(1);
  });
});
