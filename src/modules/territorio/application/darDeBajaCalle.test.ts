import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  CalleConDomiciliosError,
  comoCalleId,
  comoLugarId,
  type PuntoGeografico,
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

const { crearDarDeBajaCalle } = await import("./darDeBajaCalle");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const lugarActualId = comoLugarId("22222222-2222-4222-8222-222222222222");
const punto: PuntoGeografico = { latitud: 20.937, longitud: -89.6237 };

const calleGuardada: CalleGuardada = {
  id: calleId,
  nombre: "Calle Veintiuno",
  lugarId: lugarActualId,
  punto,
  bajaEn: null,
};

const repositorioDeCalles = (): RepositorioDeCalles => ({
  crear: vi.fn(),
  buscarPorId: vi.fn(),
  actualizar: vi.fn(),
  contarDomiciliosQueLaUsan: vi.fn(),
  listarPorLugar: vi.fn(),
});

describe("dar de baja calles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("permite la baja si solo hay reportes y deja bitacora", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorio.contarDomiciliosQueLaUsan).mockResolvedValue(0);
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...calleGuardada,
      bajaEn: new Date(),
    });

    await crearDarDeBajaCalle(repositorio)(
      calleId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    const tx = vi.mocked(repositorio.actualizar).mock.calls[0]?.[0];
    expect(repositorio.actualizar).toHaveBeenCalledWith(tx, {
      id: calleId,
      nombre: calleGuardada.nombre,
      lugarId: lugarActualId,
      punto,
      bajaEn: expect.any(Date),
    });
    expect(registrarMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ accion: "BAJA_CALLE", entidadId: calleId }),
    );
  });

  it("bloquea la baja cuando existe un domicilio principal o transversal", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorio.contarDomiciliosQueLaUsan).mockResolvedValue(1);

    await expect(
      crearDarDeBajaCalle(repositorio)(calleId, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(CalleConDomiciliosError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });
});
