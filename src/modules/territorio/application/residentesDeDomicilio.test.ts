import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoDomicilioId } from "../domain";
import type {
  LecturaDeResidentes,
  RepositorioDeResidencias,
} from "./puertosDeResidencias";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearResidentesDeDomicilio } = await import("./residentesDeDomicilio");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const domicilioId = comoDomicilioId("22222222-2222-4222-8222-222222222222");
const ganadora = "44444444-4444-4444-8444-444444444444";
const perdedora = "55555555-5555-4555-8555-555555555555";
const otra = "66666666-6666-4666-8666-666666666666";

const fichas: Record<string, { personaId: string; nombreCompleto: string }> = {
  [ganadora]: { personaId: ganadora, nombreCompleto: "Rosa Pech" },
  // La perdedora de una fusion se lee como su ganadora.
  [perdedora]: { personaId: ganadora, nombreCompleto: "Rosa Pech" },
  [otra]: { personaId: otra, nombreCompleto: "Ana Can" },
};

describe("residentesDeDomicilio", () => {
  const repositorio: RepositorioDeResidencias = {
    cerrarAbiertas: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };
  const lectura: LecturaDeResidentes = {
    residenteDe: vi.fn(async (id: string) => fichas[id] ?? null),
  };
  const residentesDeDomicilio = crearResidentesDeDomicilio(
    repositorio,
    () => lectura,
  );

  beforeEach(() => {
    vi.mocked(repositorio.residentesDe).mockReset();
    withTenantMock.mockReset();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("lee las residencias vigentes del domicilio dentro del tenant de la sesion", async () => {
    vi.mocked(repositorio.residentesDe).mockResolvedValue([otra]);

    await residentesDeDomicilio(domicilioId, contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.residentesDe).toHaveBeenCalledWith({}, [domicilioId]);
  });

  it("una identidad fusionada y su ganadora cuentan como una sola persona", async () => {
    vi.mocked(repositorio.residentesDe).mockResolvedValue([
      perdedora,
      ganadora,
    ]);

    const residentes = await residentesDeDomicilio(domicilioId, contexto);

    expect(residentes).toEqual([
      { personaId: ganadora, nombreCompleto: "Rosa Pech" },
    ]);
  });

  it("ordena a los residentes por nombre", async () => {
    vi.mocked(repositorio.residentesDe).mockResolvedValue([ganadora, otra]);

    const residentes = await residentesDeDomicilio(domicilioId, contexto);

    expect(residentes.map((r) => r.nombreCompleto)).toEqual([
      "Ana Can",
      "Rosa Pech",
    ]);
  });

  it("sin residencias vigentes devuelve una lista vacia", async () => {
    vi.mocked(repositorio.residentesDe).mockResolvedValue([]);

    expect(await residentesDeDomicilio(domicilioId, contexto)).toEqual([]);
  });

  it("una persona que el padron ya no resuelve no aparece", async () => {
    vi.mocked(repositorio.residentesDe).mockResolvedValue([
      "77777777-7777-4777-8777-777777777777",
    ]);

    expect(await residentesDeDomicilio(domicilioId, contexto)).toEqual([]);
  });
});
