import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { PersonaId } from "../domain";
import type {
  CatalogoDeAbreviaturas,
  PersonaGuardada,
  RepositorioDePersonas,
} from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearSugerirDuplicados, TOPE_SUGERENCIAS, UMBRAL_SUGERENCIA } =
  await import("./sugerirDuplicados");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const personaCon = (id: string): PersonaGuardada => ({
  id: id as PersonaId,
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: null,
  curp: null,
  bajaEn: null,
});

describe("sugerirDuplicados", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
    fusionar: vi.fn(),
    revertirFusion: vi.fn(),
    identidadesDe: vi.fn(),
  };
  const catalogo: CatalogoDeAbreviaturas = { leer: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(catalogo.leer).mockResolvedValue(new Map([["gpe", "guadalupe"]]));
  });

  it("expande la cadena una sola vez y busca con UMBRAL_SUGERENCIA", async () => {
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
    const sugerirDuplicados = crearSugerirDuplicados(repositorio, catalogo);

    await sugerirDuplicados("gpe kumul", contexto);

    expect(catalogo.leer).toHaveBeenCalledTimes(1);
    expect(repositorio.buscar).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      "guadalupe kumul",
      { umbral: UMBRAL_SUGERENCIA, limite: TOPE_SUGERENCIAS },
    );
  });

  it("nunca bloquea: sin coincidencias devuelve una lista vacia", async () => {
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
    const sugerirDuplicados = crearSugerirDuplicados(repositorio, catalogo);

    await expect(sugerirDuplicados("nadie", contexto)).resolves.toEqual([]);
  });

  it("recorta al tope aunque el repositorio devuelva mas resultados", async () => {
    const personas = Array.from({ length: 8 }, (_, i) => personaCon(`p${i}`));
    vi.mocked(repositorio.buscar).mockResolvedValue(personas);
    const sugerirDuplicados = crearSugerirDuplicados(repositorio, catalogo);

    const resultado = await sugerirDuplicados("gpe kumul", contexto);

    expect(resultado).toHaveLength(TOPE_SUGERENCIAS);
    expect(resultado).toEqual(personas.slice(0, TOPE_SUGERENCIAS));
  });
});
