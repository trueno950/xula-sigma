import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

/** Por que no hay guarda de rol aca: `listarPersonas.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarPersonas, TAMANO_DE_PAGINA } = await import(
  "./listarPersonas"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const personaDePrueba = (id: string) => ({
  id: id as PersonaId,
  nombres: "Juan",
  primerApellido: "Poot",
  segundoApellido: null,
  curp: null,
  bajaEn: null,
});

describe("listarPersonas", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
    fusionar: vi.fn(),
    identidadesDe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega el listado al repositorio, sin exigir rol", async () => {
    const personas = [personaDePrueba("persona-1")];
    vi.mocked(repositorio.listar).mockResolvedValue(personas);

    const listarPersonas = crearListarPersonas(repositorio);
    const resultado = await listarPersonas(contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.listar).toHaveBeenCalled();
    expect(resultado.personas).toBe(personas);
  });

  it("sin opciones, pide TAMANO_DE_PAGINA + 1 al repositorio y sin orden", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);

    const listarPersonas = crearListarPersonas(repositorio);
    await listarPersonas(contexto);

    expect(repositorio.listar).toHaveBeenCalledWith(expect.anything(), {
      limite: TAMANO_DE_PAGINA + 1,
    });
  });

  it("pide limite + 1 al repositorio y recorta la fila de mas antes de devolver", async () => {
    const personas = [
      personaDePrueba("p1"),
      personaDePrueba("p2"),
      personaDePrueba("p3"),
    ];
    vi.mocked(repositorio.listar).mockResolvedValue(personas);

    const listarPersonas = crearListarPersonas(repositorio);
    const resultado = await listarPersonas(contexto, { limite: 2 });

    expect(repositorio.listar).toHaveBeenCalledWith(expect.anything(), {
      limite: 3,
    });
    expect(resultado).toEqual({ personas: personas.slice(0, 2), hayMas: true });
  });

  it("cuando el repositorio trae limite o menos, hayMas es falso", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([personaDePrueba("p1")]);

    const listarPersonas = crearListarPersonas(repositorio);
    const resultado = await listarPersonas(contexto, { limite: 2 });

    expect(resultado.hayMas).toBe(false);
  });

  it("reenvia el orden pedido al repositorio", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);

    const listarPersonas = crearListarPersonas(repositorio);
    await listarPersonas(contexto, {
      orden: { campo: "persona", direccion: "desc" },
    });

    expect(repositorio.listar).toHaveBeenCalledWith(expect.anything(), {
      limite: TAMANO_DE_PAGINA + 1,
      orden: { campo: "persona", direccion: "desc" },
    });
  });
});
