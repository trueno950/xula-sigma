import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoCalleId, comoLugarId, comoZonaId } from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearQuitarCalleDeZona } = await import("./quitarCalleDeZona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");
const zonaId = comoZonaId("33333333-3333-4333-8333-333333333333");
const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const zonaActiva = { id: zonaId, nombre: "Centro", lugarId };

const repositorioDeZonas = (): RepositorioDeAdministracionDeZonas => ({
  buscarActivaPorNombre: vi.fn().mockResolvedValue(null),
  crear: vi.fn(),
  bloquearPorId: vi.fn().mockResolvedValue(zonaActiva),
  renombrar: vi.fn(),
  darDeBaja: vi.fn(),
  calleActivaPorId: vi.fn(),
  perteneceLaCalle: vi.fn().mockResolvedValue(true),
  agregarCalle: vi.fn(),
  quitarCalle: vi.fn(),
});

describe("quitar calle de zona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza a quien no administra territorio", async () => {
    const repositorio = repositorioDeZonas();

    await expect(
      crearQuitarCalleDeZona(repositorio)(
        { zonaId, calleId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
    expect(repositorio.quitarCalle).not.toHaveBeenCalled();
  });

  it("rechaza zona inexistente, ajena o dada de baja", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      crearQuitarCalleDeZona(repositorio)(
        { zonaId, calleId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza una pertenencia que no existe", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.perteneceLaCalle).mockResolvedValue(false);

    await expect(
      crearQuitarCalleDeZona(repositorio)(
        { zonaId, calleId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(repositorio.quitarCalle).not.toHaveBeenCalled();
  });

  it("quita la pertenencia y deja bitacora de ids", async () => {
    const repositorio = repositorioDeZonas();

    await crearQuitarCalleDeZona(repositorio)(
      { zonaId, calleId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.quitarCalle).toHaveBeenCalledWith(expect.anything(), {
      zonaId,
      calleId,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "QUITAR_CALLE_DE_ZONA",
        entidad: "calles_de_zonas",
        entidadId: zonaId,
      }),
    );
    // `bitacora.entidad_id` es uuid: un id compuesto revienta en Postgres
    // con 22P02, y el mock del puerto no lo habria visto.
    const trazaDeLaAccion = registrarMock.mock.calls[0];
    if (!trazaDeLaAccion) throw new Error("La accion no dejo bitacora.");
    expect((trazaDeLaAccion[1] as { entidadId: string }).entidadId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
