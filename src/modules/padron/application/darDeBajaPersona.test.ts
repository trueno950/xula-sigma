import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import type { PersonaId } from "../domain";
import type { PersonaGuardada, RepositorioDePersonas } from "./puertos";

const personaExistente: PersonaGuardada = {
  id: "persona-1" as PersonaId,
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

const { crearDarDeBajaPersona } = await import("./darDeBajaPersona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

/**
 * "Sin motivo estructurado" (proposal.md, pregunta 5 de propuesta): la
 * firma del caso de uso no acepta ningun campo de motivo. Un test que
 * afirmara "el motivo no se guarda" no probaria nada que el tipo no
 * imponga ya — lo que se prueba aca es lo que si tiene comportamiento:
 * `bajaEn` se fija y la bitacora registra `BAJA_PERSONA`.
 */
describe("darDeBajaPersona", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(personaExistente);
  });

  it("rechaza sin puedeEscribir y no marca la baja", async () => {
    const darDeBajaPersona = crearDarDeBajaPersona(repositorio);

    await expect(
      darDeBajaPersona("persona-1" as PersonaId, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(repositorio.marcarBaja).not.toHaveBeenCalled();
  });

  it("rechaza con NoEncontradoError cuando el id no existe o es de otro tenant, sin escribir bitacora", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const darDeBajaPersona = crearDarDeBajaPersona(repositorio);

    await expect(
      darDeBajaPersona(
        "persona-ajena" as PersonaId,
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.marcarBaja).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("con permiso fija bajaEn y registra BAJA_PERSONA en la misma transaccion", async () => {
    const darDeBajaPersona = crearDarDeBajaPersona(repositorio);

    await darDeBajaPersona(
      "persona-1" as PersonaId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.marcarBaja).toHaveBeenCalledWith(
      expect.anything(),
      "persona-1",
      expect.any(Date),
    );
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "BAJA_PERSONA",
        entidad: "personas",
        entidadId: "persona-1",
      }),
    );
  });
});
