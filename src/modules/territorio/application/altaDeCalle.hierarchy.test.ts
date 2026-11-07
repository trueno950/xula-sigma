import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  CatalogoDeCallesSoloEnAsentamientosError,
  comoLugarId,
} from "../domain";
import type { LugarGuardado, RepositorioDeCalles } from "./puertos";
import { crearRepositorioDeLugaresFalso } from "./repositorioDeLugaresDePrueba";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: vi.fn(),
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: vi.fn(),
}));

const { crearAltaDeCalle } = await import("./altaDeCalle");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const lugar: LugarGuardado = {
  id: lugarId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};

describe("altaDeCalle hierarchy boundary", () => {
  const repositorio: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    contarZonasQueLaUsan: vi.fn().mockResolvedValue(0),
    contarZonasActivasQueLaUsan: vi.fn().mockResolvedValue(0),
    listarPorLugar: vi.fn(),
    registrarEventoDeAlta: vi.fn(),
    registrarEventoDeRenombre: vi.fn(),
    registrarEventoDeReparenteo: vi.fn(),
    registrarEventoDeUbicacion: vi.fn(),
  };
  const repositorioDeLugares = crearRepositorioDeLugaresFalso();

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  for (const tipo of ["colonia"] as const) {
    it(`rejects creating a street under ${tipo} before insert`, async () => {
      vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue({
        ...lugar,
        tipo,
      });

      await expect(
        crearAltaDeCalle(repositorio, repositorioDeLugares)(
          { nombre: "Calle 21", lugarId },
          contexto,
        ),
      ).rejects.toBeInstanceOf(CatalogoDeCallesSoloEnAsentamientosError);

      expect(repositorio.crear).not.toHaveBeenCalled();
    });
  }

  it("bloquea la fila del asentamiento, para serializarse con su baja", async () => {
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(lugar);

    await crearAltaDeCalle(repositorio, repositorioDeLugares)(
      { nombre: "Calle 21", lugarId },
      contexto,
    );

    expect(repositorioDeLugares.bloquearPorId).toHaveBeenCalledWith(
      expect.anything(),
      lugarId,
    );
  });
});
