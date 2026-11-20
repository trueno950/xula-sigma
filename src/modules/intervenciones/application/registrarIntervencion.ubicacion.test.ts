import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type { RepositorioDeIntervenciones } from "./puertos";
import type { CalleEnElLugar, LecturaDeUbicaciones } from "./puertosDeLectura";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: vi.fn(),
}));

const { crearRegistrarIntervencion } = await import("./index");
const { CalleFueraDelLugarError } = await import("../domain");

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";

const entrada = {
  tipo: "OBRA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId: LUGAR,
  calleId: null,
  reporteId: null,
  descripcion: "Rehabilitacion del parque municipal",
};

/**
 * S6 de `intervenciones-ux`: la calle depende del lugar. `partesDe` resuelve
 * cualquier pareja de filas guardadas -una colonia reparentada deja de ser
 * coherente sin dejar de resolver-, asi que el veredicto lo da `calleDelLugar`.
 */
describe("registrarIntervencion: la calle cuelga del asentamiento del lugar", () => {
  const repositorio: Pick<RepositorioDeIntervenciones, "guardar"> = {
    guardar: vi.fn(),
  };
  const calleDelLugar = vi.fn();
  const lectura = {
    de: vi.fn(),
    calleDelLugar,
  } as unknown as LecturaDeUbicaciones;
  const lecturaDeReportes = { porId: vi.fn() };

  const registrar = (calleId: string | null) =>
    crearRegistrarIntervencion({
      repositorio,
      crearLecturaDeUbicaciones: () => lectura,
      crearLecturaDeReportes: () => lecturaDeReportes,
    })({ ...entrada, calleId }, contexto);

  const conCalleEnElLugar = (estado: CalleEnElLugar) =>
    calleDelLugar.mockResolvedValue(estado);

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lectura.de).mockResolvedValue({ texto: "Centro" });
    vi.mocked(lecturaDeReportes.porId).mockResolvedValue(true);
    conCalleEnElLugar("del-lugar");
  });

  it("rechaza una calle de otro asentamiento, sin guardar ni auditar", async () => {
    conCalleEnElLugar("fuera-del-lugar");

    await expect(registrar(CALLE)).rejects.toBeInstanceOf(
      CalleFueraDelLugarError,
    );

    expect(calleDelLugar).toHaveBeenCalledWith({}, LUGAR, CALLE);
    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza como inexistente una calle que ya no resuelve", async () => {
    conCalleEnElLugar("no-resuelve");

    await expect(registrar(CALLE)).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("rechaza una ubicacion inexistente aunque se haya elegido calle", async () => {
    vi.mocked(lectura.de).mockResolvedValue(null);

    await expect(registrar(CALLE)).rejects.toBeInstanceOf(NoEncontradoError);

    expect(calleDelLugar).not.toHaveBeenCalled();
    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("guarda la calle que si cuelga del asentamiento del lugar", async () => {
    await registrar(CALLE);

    expect(repositorio.guardar).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ calleId: CALLE }),
    );
  });

  /** Un lector que no implementa el veredicto no puede aceptar una calle. */
  it("sin lector del veredicto la calle se rechaza como no encontrada", async () => {
    const sinVeredicto = crearRegistrarIntervencion({
      repositorio,
      crearLecturaDeUbicaciones: () => ({ de: lectura.de }),
      crearLecturaDeReportes: () => lecturaDeReportes,
    });

    await expect(
      sinVeredicto({ ...entrada, calleId: CALLE }, contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("guarda una intervencion sin calle sin preguntar por el asentamiento", async () => {
    await registrar(null);

    expect(calleDelLugar).not.toHaveBeenCalled();
    expect(repositorio.guardar).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ calleId: null }),
    );
  });
});
