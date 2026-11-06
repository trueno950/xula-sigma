import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";

const mocks = vi.hoisted(() => ({
  contarContenidoDeLugares: vi.fn(),
  listarLugares: vi.fn(),
  listarRaices: vi.fn(),
  residentesDeDomicilio: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  ...mocks,
}));
vi.mock("./cargaDeEntrada", () => ({ cargarEntrada: vi.fn(async () => ({})) }));

const { cargarTerritorio } = await import("./cargaDeTerritorio");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "u1", rol: "CONSULTA" },
  origen: "web",
};
const DOMICILIO = "55555555-5555-4555-8555-555555555555";
const rosa = {
  personaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  nombreCompleto: "Rosa Pech",
};

const cargar = (domicilio: { id: string } | null) =>
  cargarTerritorio({
    contexto,
    parametros: {} as Parameters<typeof cargarTerritorio>[0]["parametros"],
    raiz: null,
    seleccion: {
      nodos: [],
      nodo: null,
      calles: [],
      domicilio,
    } as unknown as Parameters<typeof cargarTerritorio>[0]["seleccion"],
  });

describe("cargarTerritorio: residentes del domicilio abierto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contarContenidoDeLugares.mockResolvedValue([]);
    mocks.listarLugares.mockResolvedValue([]);
    mocks.listarRaices.mockResolvedValue([]);
    mocks.residentesDeDomicilio.mockResolvedValue([rosa]);
  });

  it("con un domicilio abierto, lee sus residentes con el contexto de la sesion", async () => {
    const carga = await cargar({ id: DOMICILIO });

    expect(mocks.residentesDeDomicilio).toHaveBeenCalledWith(
      DOMICILIO,
      contexto,
    );
    expect(carga.residentes).toEqual([rosa]);
  });

  it("sin domicilio abierto no consulta residentes", async () => {
    const carga = await cargar(null);

    expect(mocks.residentesDeDomicilio).not.toHaveBeenCalled();
    expect(carga.residentes).toEqual([]);
  });
});
