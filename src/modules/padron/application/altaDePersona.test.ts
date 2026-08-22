import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import type { DatosDePersona } from "../domain";
import type { CatalogoDeAbreviaturas, RepositorioDePersonas } from "./puertos";

/**
 * `withTenant.ts` abre el pool de Postgres al importarse (mismo problema
 * que documenta `shared/tenancy/contexto.test.ts`), asi que se mockea
 * entero junto con `registrar`, para que este test corra sin Postgres con
 * los puertos mockeados (tasks.md 2.4).
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDePersona } = await import("./altaDePersona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const datos: DatosDePersona = {
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: "Pech",
  curp: null,
};

describe("altaDePersona", () => {
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
  });

  it("rechaza sin puedeEscribir y no abre transaccion ni escribe", async () => {
    const altaDePersona = crearAltaDePersona(repositorio, catalogo);

    await expect(
      altaDePersona(datos, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("con permiso guarda la persona y registra el alta en la misma transaccion", async () => {
    const altaDePersona = crearAltaDePersona(repositorio, catalogo);

    const resultado = await altaDePersona(
      datos,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.guardar).toHaveBeenCalledWith(expect.anything(), {
      id: resultado.id,
      ayuntamientoId: "motul",
      persona: {
        nombres: datos.nombres,
        primerApellido: datos.primerApellido,
        segundoApellido: datos.segundoApellido,
        curp: datos.curp,
      },
      expansiones: expect.any(Map),
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "ALTA_PERSONA",
        entidad: "personas",
        entidadId: resultado.id,
      }),
    );
  });
});
