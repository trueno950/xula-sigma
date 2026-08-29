import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { comoLugarId } from "../domain";
import type { RepositorioDeCalles } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeCalle } = await import("./altaDeCalle");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const comisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");

describe("altaDeCalle", () => {
  const repositorio: RepositorioDeCalles = {
    crear: vi.fn(),
    actualizar: vi.fn(),
    listarPorLugar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza sin puedeAdministrarTerritorio y no abre transaccion ni escribe", async () => {
    const altaDeCalle = crearAltaDeCalle(repositorio);

    await expect(
      altaDeCalle(
        { nombre: "Calle 21", lugarId: cabeceraId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("una Calle 21 de la cabecera y otra de una comisaria distinta conviven", async () => {
    const altaDeCalle = crearAltaDeCalle(repositorio);

    const dela = await altaDeCalle(
      { nombre: "Calle 21", lugarId: cabeceraId },
      contextoCon("ADMIN_MUNICIPAL"),
    );
    const delaOtra = await altaDeCalle(
      { nombre: "Calle 21", lugarId: comisariaId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.crear).toHaveBeenCalledTimes(2);
    expect(repositorio.crear).toHaveBeenNthCalledWith(1, expect.anything(), {
      id: dela.id,
      ayuntamientoId: "motul",
      nombre: "Calle 21",
      lugarId: cabeceraId,
    });
    expect(repositorio.crear).toHaveBeenNthCalledWith(2, expect.anything(), {
      id: delaOtra.id,
      ayuntamientoId: "motul",
      nombre: "Calle 21",
      lugarId: comisariaId,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "ALTA_CALLE",
        entidad: "calles",
        entidadId: dela.id,
      }),
    );
  });
});
