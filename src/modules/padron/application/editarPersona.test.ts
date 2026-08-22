import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import type { DatosDePersona } from "../domain";
import type {
  CatalogoDeAbreviaturas,
  PersonaGuardada,
  RepositorioDePersonas,
} from "./puertos";

const personaExistente: PersonaGuardada = {
  id: "persona-1",
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: "Pech",
  curp: null,
  bajaEn: null,
};

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearEditarPersona } = await import("./editarPersona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const datosCorregidos: DatosDePersona = {
  nombres: "Maria Guadalupe",
  primerApellido: "Canul",
  segundoApellido: "Pech",
  curp: null,
};

describe("editarPersona", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
  };
  const catalogo: CatalogoDeAbreviaturas = { leer: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(catalogo.leer).mockResolvedValue(new Map());
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(personaExistente);
  });

  it("rechaza sin puedeEscribir y no actualiza", async () => {
    const editarPersona = crearEditarPersona(repositorio, catalogo);

    await expect(
      editarPersona("persona-1", datosCorregidos, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza con NoEncontradoError cuando el id no existe o es de otro tenant, sin escribir bitacora", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const editarPersona = crearEditarPersona(repositorio, catalogo);

    await expect(
      editarPersona("persona-ajena", datosCorregidos, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("al corregir primerApellido pasa los datos nuevos para que el adaptador recalcule el normalizado", async () => {
    const editarPersona = crearEditarPersona(repositorio, catalogo);

    await editarPersona("persona-1", datosCorregidos, contextoCon("OPERADOR"));

    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: "persona-1",
      persona: {
        nombres: datosCorregidos.nombres,
        primerApellido: "Canul",
        segundoApellido: datosCorregidos.segundoApellido,
        curp: datosCorregidos.curp,
      },
      expansiones: expect.any(Map),
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "EDITAR_PERSONA",
        entidad: "personas",
        entidadId: "persona-1",
      }),
    );
  });
});
