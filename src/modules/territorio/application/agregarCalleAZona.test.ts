import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  CalleFueraDelAsentamientoError,
  comoCalleId,
  comoLugarId,
  comoZonaId,
} from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAgregarCalleAZona } = await import("./agregarCalleAZona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");
const otroLugarId = comoLugarId("55555555-5555-4555-8555-555555555555");
const zonaId = comoZonaId("33333333-3333-4333-8333-333333333333");
const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const zonaActiva = { id: zonaId, nombre: "Centro", lugarId };

const repositorioDeZonas = (): RepositorioDeAdministracionDeZonas => ({
  buscarActivaPorNombre: vi.fn().mockResolvedValue(null),
  crear: vi.fn(),
  bloquearPorId: vi.fn().mockResolvedValue(zonaActiva),
  renombrar: vi.fn(),
  darDeBaja: vi.fn(),
  calleActivaPorId: vi.fn().mockResolvedValue({ id: calleId, lugarId }),
  perteneceLaCalle: vi.fn().mockResolvedValue(false),
  agregarCalle: vi.fn(),
  quitarCalle: vi.fn(),
});

describe("agregar calle a zona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza a quien no administra territorio", async () => {
    const repositorio = repositorioDeZonas();

    await expect(
      crearAgregarCalleAZona(repositorio)(
        { zonaId, calleId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
    expect(repositorio.agregarCalle).not.toHaveBeenCalled();
  });

  it("rechaza zona inexistente, ajena o dada de baja", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      crearAgregarCalleAZona(repositorio)(
        { zonaId, calleId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza calle inexistente o dada de baja", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.calleActivaPorId).mockResolvedValue(null);

    await expect(
      crearAgregarCalleAZona(repositorio)(
        { zonaId, calleId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(repositorio.agregarCalle).not.toHaveBeenCalled();
  });

  it("rechaza una calle de otro asentamiento", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.calleActivaPorId).mockResolvedValue({
      id: calleId,
      lugarId: otroLugarId,
    });

    await expect(
      crearAgregarCalleAZona(repositorio)(
        { zonaId, calleId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(CalleFueraDelAsentamientoError);
    expect(repositorio.agregarCalle).not.toHaveBeenCalled();
  });

  it("es idempotente si la calle ya pertenece", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.perteneceLaCalle).mockResolvedValue(true);

    await crearAgregarCalleAZona(repositorio)(
      { zonaId, calleId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.agregarCalle).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("agrega la pertenencia y deja bitacora de ids", async () => {
    const repositorio = repositorioDeZonas();

    await crearAgregarCalleAZona(repositorio)(
      { zonaId, calleId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.agregarCalle).toHaveBeenCalledWith(expect.anything(), {
      zonaId,
      calleId,
      lugarId,
      ayuntamientoId: "motul",
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "AGREGAR_CALLE_A_ZONA",
        entidad: "calles_de_zonas",
        entidadId: `${zonaId}/${calleId}`,
      }),
    );
  });
});
