import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoDomicilioId, comoLugarId } from "../domain";
import type {
  DomicilioGuardado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";
import type { RepositorioDeResidencias } from "./puertosDeResidencias";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearResidentesDe } = await import("./residentesDe");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const domicilioUno = comoDomicilioId("22222222-2222-4222-8222-222222222222");
const domicilioDos = comoDomicilioId("33333333-3333-4333-8333-333333333333");
const personaId = "44444444-4444-4444-8444-444444444444";

describe("residentesDe", () => {
  const repositorioDeDomicilios: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    registro: vi.fn(),
    listar: vi.fn(),
  };
  const repositorioDeResidencias: RepositorioDeResidencias = {
    cerrarAbierta: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("resuelve los domicilios del subarbol y filtra sus residentes vigentes", async () => {
    vi.mocked(repositorioDeDomicilios.porLugarYSubarbol).mockResolvedValue([
      { id: domicilioUno } as DomicilioGuardado,
      { id: domicilioDos } as DomicilioGuardado,
    ]);
    vi.mocked(repositorioDeResidencias.residentesDe).mockResolvedValue([
      personaId,
    ]);

    const residentesDe = crearResidentesDe(
      repositorioDeDomicilios,
      repositorioDeResidencias,
    );
    const resultado = await residentesDe(lugarId, contexto);

    expect(repositorioDeDomicilios.porLugarYSubarbol).toHaveBeenCalledWith(
      expect.anything(),
      lugarId,
    );
    expect(repositorioDeResidencias.residentesDe).toHaveBeenCalledWith(
      expect.anything(),
      [domicilioUno, domicilioDos],
    );
    expect(resultado).toEqual([personaId]);
  });

  it("un sector sin domicilios devuelve una lista vacia sin exigir rol", async () => {
    vi.mocked(repositorioDeDomicilios.porLugarYSubarbol).mockResolvedValue([]);
    vi.mocked(repositorioDeResidencias.residentesDe).mockResolvedValue([]);

    const residentesDe = crearResidentesDe(
      repositorioDeDomicilios,
      repositorioDeResidencias,
    );

    await expect(residentesDe(lugarId, contexto)).resolves.toEqual([]);
  });
});
