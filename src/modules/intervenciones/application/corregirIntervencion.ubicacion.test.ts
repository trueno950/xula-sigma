import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type {
  IntervencionGuardada,
  RepositorioDeIntervenciones,
} from "./puertos";
import type { CalleEnElLugar, LecturaDeUbicaciones } from "./puertosDeLectura";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: vi.fn(),
}));

const { crearCorregirIntervencion } = await import("./corregirIntervencion");
const { CalleFueraDelLugarError } = await import("../domain");

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const LUGAR = "22222222-2222-4222-8222-222222222222";
const OTRO_LUGAR = "77777777-7777-4777-8777-777777777777";
const CALLE = "44444444-4444-4444-8444-444444444444";
const OTRA_CALLE = "88888888-8888-4888-8888-888888888888";

const entrada = {
  id: "33333333-3333-4333-8333-333333333333",
  tipo: "MEJORA" as const,
  fechaDeOcurrencia: "2026-02-20",
  lugarId: LUGAR,
  calleId: CALLE,
  reporteId: null,
  descripcion: "Rehabilitacion del parque municipal",
};

const guardada = (cambios: Partial<IntervencionGuardada> = {}) =>
  ({
    id: entrada.id,
    tipo: "OBRA",
    estado: "PLANIFICADA",
    fechaDeOcurrencia: "2026-01-15",
    lugarId: LUGAR,
    calleId: CALLE,
    reporteId: null,
    descripcion: "Rehabilitacion del parque municipal",
    registradoPorUsuarioId: "usuario-1",
    capturadoEn: new Date(),
    actualizadoEn: new Date(),
    ...cambios,
  }) as IntervencionGuardada;

/**
 * S6 de `intervenciones-ux`. Una colonia reparentada deja la pareja guardada
 * incoherente sin dejar de resolver, y esa intervencion se tiene que poder
 * seguir corrigiendo: la regla exige la calle del asentamiento salvo cuando la
 * pareja enviada es exactamente la guardada.
 */
describe("corregirIntervencion: la calle cuelga del asentamiento del lugar", () => {
  const repositorio = {
    corregir: vi.fn(),
    buscarPorId: vi.fn(),
  } as unknown as Pick<RepositorioDeIntervenciones, "corregir" | "buscarPorId">;
  const calleDelLugar = vi.fn();
  const lectura = {
    de: vi.fn(),
    calleDelLugar,
  } as unknown as LecturaDeUbicaciones;
  const lecturaDeReportes = { porId: vi.fn() };
  const corregir = crearCorregirIntervencion({
    repositorio,
    crearLecturaDeUbicaciones: () => lectura,
    crearLecturaDeReportes: () => lecturaDeReportes,
  });

  const conCalleEnElLugar = (estado: CalleEnElLugar) =>
    calleDelLugar.mockResolvedValue(estado);

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (actualTx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardada());
    vi.mocked(repositorio.corregir).mockResolvedValue(true);
    vi.mocked(lectura.de).mockResolvedValue({ texto: "Centro" });
    vi.mocked(lecturaDeReportes.porId).mockResolvedValue(true);
    conCalleEnElLugar("del-lugar");
  });

  it("rechaza una calle de otro asentamiento cuando la pareja guardada es otra", async () => {
    conCalleEnElLugar("fuera-del-lugar");

    await expect(
      corregir({ ...entrada, calleId: OTRA_CALLE }, contexto),
    ).rejects.toBeInstanceOf(CalleFueraDelLugarError);

    expect(calleDelLugar).toHaveBeenCalledWith({}, LUGAR, OTRA_CALLE);
    expect(repositorio.buscarPorId).toHaveBeenCalledWith({}, entrada.id);
    expect(repositorio.corregir).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  /**
   * La colonia se movio a otra comisaria y su calle quedo en la anterior: la
   * pareja guardada ya es incoherente, y corregir el resto no la toca.
   */
  it("deja pasar la pareja guardada aunque haya dejado de ser coherente", async () => {
    conCalleEnElLugar("fuera-del-lugar");

    await corregir(
      { ...entrada, descripcion: "Otra descripcion del trabajo" },
      contexto,
    );

    expect(repositorio.corregir).toHaveBeenCalledOnce();
  });

  it("rechaza un lugar de otro municipio cuando la correccion lo cambia", async () => {
    vi.mocked(lectura.de).mockResolvedValue(null);

    await expect(
      corregir({ ...entrada, lugarId: OTRO_LUGAR }, contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.corregir).not.toHaveBeenCalled();
  });

  it("rechaza una calle que ya no resuelve sin llegar a escribir", async () => {
    conCalleEnElLugar("no-resuelve");

    await expect(corregir(entrada, contexto)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );

    expect(repositorio.corregir).not.toHaveBeenCalled();
  });

  it("acepta una calle del asentamiento del lugar sin leer la fila guardada", async () => {
    await corregir({ ...entrada, calleId: OTRA_CALLE }, contexto);

    expect(repositorio.buscarPorId).not.toHaveBeenCalled();
    expect(repositorio.corregir).toHaveBeenCalledOnce();
  });

  it("una correccion sin calle no pregunta por el asentamiento", async () => {
    await corregir({ ...entrada, calleId: null }, contexto);

    expect(calleDelLugar).not.toHaveBeenCalled();
    expect(repositorio.corregir).toHaveBeenCalledOnce();
  });

  /** Un lector que no implementa el veredicto no puede aceptar una calle. */
  it("sin lector del veredicto la correccion con calle no se guarda", async () => {
    const sinVeredicto = crearCorregirIntervencion({
      repositorio: {
        corregir: vi.fn().mockResolvedValue(true),
        buscarPorId: vi.fn(),
      },
      crearLecturaDeUbicaciones: () => ({ de: lectura.de }),
      crearLecturaDeReportes: () => lecturaDeReportes,
    });

    await expect(sinVeredicto(entrada, contexto)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
  });

  it("sin lector de la fila guardada la calle ajena se rechaza igual", async () => {
    conCalleEnElLugar("fuera-del-lugar");
    const sinLector = crearCorregirIntervencion({
      repositorio: { corregir: vi.fn().mockResolvedValue(true) },
      crearLecturaDeUbicaciones: () => lectura,
      crearLecturaDeReportes: () => lecturaDeReportes,
    });

    await expect(sinLector(entrada, contexto)).rejects.toBeInstanceOf(
      CalleFueraDelLugarError,
    );
  });
});
