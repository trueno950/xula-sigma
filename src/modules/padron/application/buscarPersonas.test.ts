import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { PersonaId } from "../domain";
import type { CatalogoDeAbreviaturas, RepositorioDePersonas } from "./puertos";

/**
 * Mismo motivo que `altaDePersona.test.ts`: `withTenant.ts` abre el pool al
 * importarse, asi que se mockea junto con los puertos.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearBuscarPersonas, UMBRAL_BUSQUEDA } = await import(
  "./buscarPersonas"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("buscarPersonas", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
    fusionar: vi.fn(),
    revertirFusion: vi.fn(),
  };
  const catalogo: CatalogoDeAbreviaturas = { leer: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(catalogo.leer).mockResolvedValue(new Map([["gpe", "guadalupe"]]));
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
  });

  it("expande la cadena una sola vez y la pasa ya armada al repositorio", async () => {
    const buscarPersonas = crearBuscarPersonas(repositorio, catalogo);

    await buscarPersonas("gpe kumul", contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(catalogo.leer).toHaveBeenCalledTimes(1);
    expect(repositorio.buscar).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      "guadalupe kumul",
      UMBRAL_BUSQUEDA,
    );
  });

  it("devuelve lo que responde el repositorio", async () => {
    const buscarPersonas = crearBuscarPersonas(repositorio, catalogo);
    const encontrada = {
      id: "persona-1" as PersonaId,
      nombres: "Maria Guadalupe",
      primerApellido: "Kumul",
      segundoApellido: null,
      curp: null,
      bajaEn: null,
    };
    vi.mocked(repositorio.buscar).mockResolvedValue([encontrada]);

    const resultado = await buscarPersonas("gpe kumul", contexto);

    expect(resultado).toEqual([encontrada]);
  });
});
