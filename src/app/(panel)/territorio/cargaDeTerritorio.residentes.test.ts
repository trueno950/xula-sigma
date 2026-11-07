import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";

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

/** S4 de `territorio-pendientes`: un fallo aqui tumbaba el panel entero. */
describe("cargarTerritorio: si la lectura de residentes falla", () => {
  const registro = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contarContenidoDeLugares.mockResolvedValue([]);
    mocks.listarLugares.mockResolvedValue([]);
    mocks.listarRaices.mockResolvedValue([]);
  });

  afterEach(() => registro.mockClear());

  it("la pantalla carga igual y marca los residentes como no leidos", async () => {
    mocks.residentesDeDomicilio.mockRejectedValue(new Error("se cayo"));

    const carga = await cargar({ id: DOMICILIO });

    expect(carga.residentes).toBeNull();
  });

  it("lo registra con el id del domicilio y sin el texto del error", async () => {
    // Un error de Postgres trae valores de la fila en su mensaje.
    mocks.residentesDeDomicilio.mockRejectedValue(
      new Error("Key (nombre)=(Rosa Pech) Calle 21 #4"),
    );

    await cargar({ id: DOMICILIO });

    expect(registro).toHaveBeenCalledTimes(1);
    const registrado = JSON.stringify(registro.mock.calls[0]);
    expect(registrado).toContain(DOMICILIO);
    expect(registrado).not.toContain("Rosa Pech");
    expect(registrado).not.toContain("Calle 21");
  });

  it("un rechazo por permiso no se disfraza: sigue propagando", async () => {
    mocks.residentesDeDomicilio.mockRejectedValue(new NoAutorizadoError());

    await expect(cargar({ id: DOMICILIO })).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });
});
