import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId, comoZonaId } from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearDarDeBajaZona } = await import("./darDeBajaZona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const zonaId = comoZonaId("33333333-3333-4333-8333-333333333333");
const zonaActiva = {
  id: zonaId,
  nombre: "Centro",
  lugarId: comoLugarId("22222222-2222-4222-8222-222222222222"),
};

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

describe("dar de baja zona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza a quien no administra territorio", async () => {
    const repositorio = repositorioDeZonas();

    await expect(
      crearDarDeBajaZona(repositorio)(zonaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
    expect(repositorio.darDeBaja).not.toHaveBeenCalled();
  });

  it("rechaza zona inexistente, ajena o ya dada de baja", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      crearDarDeBajaZona(repositorio)(zonaId, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(repositorio.darDeBaja).not.toHaveBeenCalled();
  });

  it("da de baja y deja bitacora de ids", async () => {
    const repositorio = repositorioDeZonas();

    await crearDarDeBajaZona(repositorio)(
      zonaId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.darDeBaja).toHaveBeenCalledWith(
      expect.anything(),
      zonaId,
    );
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "BAJA_ZONA",
        entidad: "zonas",
        entidadId: zonaId,
      }),
    );
  });
});
