import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoLugarId } from "../domain";
import type {
  CalleConEventos,
  LectorDeCallesDeMapa,
} from "./puertosDeLecturaDeCalles";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearCallePorId } = await import("./callePorId");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");

const calleConEventos: CalleConEventos = {
  id: calleId,
  nombre: "Calle 21",
  lugarId: comoLugarId("22222222-2222-4222-8222-222222222222"),
  punto: { latitud: 20.937, longitud: -89.6237 },
  bajaEn: null,
  eventos: [
    {
      id: "evento-1",
      naturaleza: "RENOMBRE",
      ocurridoEn: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "evento-2",
      naturaleza: "UBICACION",
      ocurridoEn: new Date("2026-01-02T00:00:00.000Z"),
    },
  ],
};

describe("callePorId", () => {
  const lector: LectorDeCallesDeMapa = {
    listarParaMapa: vi.fn(),
    leerConEventos: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lector.leerConEventos).mockResolvedValue(calleConEventos);
  });

  it("devuelve la calle vigente y sus eventos estructurales", async () => {
    const calle = await crearCallePorId(lector)(
      calleId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(calle).toEqual(calleConEventos);
    expect(lector.leerConEventos).toHaveBeenCalledWith({}, calleId);
  });

  it("trata una calle invisible o inexistente como ausencia", async () => {
    vi.mocked(lector.leerConEventos).mockResolvedValue(null);

    await expect(
      crearCallePorId(lector)(calleId, contextoCon("ADMIN_MUNICIPAL")),
    ).resolves.toBeNull();
  });

  it("fija el tenant desde el contexto del servidor", async () => {
    await crearCallePorId(lector)(calleId, contextoCon("ADMIN_MUNICIPAL"));

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
  });

  it("no exige puedeAdministrarTerritorio: un OPERADOR puede leer la ficha", async () => {
    await expect(
      crearCallePorId(lector)(calleId, contextoCon("OPERADOR")),
    ).resolves.toEqual(calleConEventos);
  });
});
