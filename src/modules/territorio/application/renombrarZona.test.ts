import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId, comoZonaId, NombreDeZonaDuplicadoError } from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearRenombrarZona } = await import("./renombrarZona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");
const zonaId = comoZonaId("33333333-3333-4333-8333-333333333333");
const zonaActiva = { id: zonaId, nombre: "Centro", lugarId };

const repositorioDeZonas = (): RepositorioDeAdministracionDeZonas => ({
  buscarActivaPorNombre: vi.fn().mockResolvedValue(null),
  crear: vi.fn(),
  bloquearPorId: vi.fn().mockResolvedValue(zonaActiva),
  renombrar: vi.fn(),
  darDeBaja: vi.fn(),
  calleActivaPorId: vi.fn(),
  perteneceLaCalle: vi.fn().mockResolvedValue(false),
  agregarCalle: vi.fn(),
  quitarCalle: vi.fn(),
});

describe("renombrar zona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza a quien no administra territorio", async () => {
    const repositorio = repositorioDeZonas();

    await expect(
      crearRenombrarZona(repositorio)(zonaId, "Norte", contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
    expect(repositorio.renombrar).not.toHaveBeenCalled();
  });

  it("rechaza zona inexistente, ajena o dada de baja", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      crearRenombrarZona(repositorio)(
        zonaId,
        "Norte",
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza el nombre de otra zona activa del asentamiento (S6)", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.buscarActivaPorNombre).mockResolvedValue({
      id: comoZonaId("44444444-4444-4444-8444-444444444444"),
      nombre: "Norte",
      lugarId,
    });

    await expect(
      crearRenombrarZona(repositorio)(
        zonaId,
        "Norte",
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NombreDeZonaDuplicadoError);
    expect(repositorio.renombrar).not.toHaveBeenCalled();
  });

  it("acepta conservar su propio nombre", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.buscarActivaPorNombre).mockResolvedValue(zonaActiva);

    await crearRenombrarZona(repositorio)(
      zonaId,
      "Centro",
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.renombrar).toHaveBeenCalledWith(expect.anything(), {
      id: zonaId,
      nombre: "Centro",
    });
  });

  it("renombra y deja bitacora de ids", async () => {
    const repositorio = repositorioDeZonas();

    await crearRenombrarZona(repositorio)(
      zonaId,
      "Norte",
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.renombrar).toHaveBeenCalledWith(expect.anything(), {
      id: zonaId,
      nombre: "Norte",
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "RENOMBRAR_ZONA",
        entidad: "zonas",
        entidadId: zonaId,
      }),
    );
  });
});
