import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  comoCalleId,
  comoLugarId,
  NombreDeCalleDuplicadoError,
} from "../domain";
import type { CalleGuardada, RepositorioDeCalles } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearRenombrarCalle } = await import("./renombrarCalle");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");

const calleGuardada: CalleGuardada = {
  id: calleId,
  nombre: "Calle Veintiuno",
  lugarId,
  punto: null,
  bajaEn: null,
};

describe("renombrarCalle", () => {
  const repositorio: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    listarPorLugar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(calleGuardada);
  });

  it("rechaza sin puedeAdministrarTerritorio y no abre transaccion ni escribe", async () => {
    const renombrarCalle = crearRenombrarCalle(repositorio);

    await expect(
      renombrarCalle(calleId, "Calle Veintiuno", contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("renombra y registra bitacora", async () => {
    vi.mocked(repositorio.actualizar).mockResolvedValue(calleGuardada);
    const renombrarCalle = crearRenombrarCalle(repositorio);

    await renombrarCalle(
      calleId,
      "Calle Veintiuno",
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: calleId,
      nombre: "Calle Veintiuno",
      lugarId,
      punto: null,
      bajaEn: null,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "RENOMBRAR_CALLE",
        entidad: "calles",
        entidadId: calleId,
      }),
    );
  });

  it("rechaza como si no existiera cuando el UPDATE afecta cero filas", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const renombrarCalle = crearRenombrarCalle(repositorio);

    await expect(
      renombrarCalle(
        calleId,
        "Calle Veintiuno",
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("propaga NombreDeCalleDuplicadoError del repositorio sin envolverlo", async () => {
    vi.mocked(repositorio.actualizar).mockRejectedValue(
      new NombreDeCalleDuplicadoError(),
    );
    const renombrarCalle = crearRenombrarCalle(repositorio);

    await expect(
      renombrarCalle(calleId, "Calle 21", contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NombreDeCalleDuplicadoError);

    expect(registrarMock).not.toHaveBeenCalled();
  });
});
