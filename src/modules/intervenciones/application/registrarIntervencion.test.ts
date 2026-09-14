import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import type {
  IntervencionGuardada,
  RepositorioDeIntervenciones,
} from "./puertos";
import type { LecturaDeUbicaciones } from "./puertosDeLectura";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));

const { crearIntervencionPorId, crearRegistrarIntervencion } = await import(
  "./index"
);

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const entrada = {
  tipo: "OBRA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  reporteId: null,
  descripcion: "Rehabilitacion del parque municipal",
};

describe("registrarIntervencion", () => {
  const repositorio: Pick<RepositorioDeIntervenciones, "guardar"> = {
    guardar: vi.fn(),
  };
  const lectura: LecturaDeUbicaciones = { de: vi.fn() };
  const lecturaDeReportes = { porId: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lectura.de).mockResolvedValue({ texto: "Centro" });
    vi.mocked(lecturaDeReportes.porId).mockResolvedValue(true);
  });

  const registrar = () =>
    crearRegistrarIntervencion({
      repositorio,
      crearLecturaDeUbicaciones: () => lectura,
      crearLecturaDeReportes: () => lecturaDeReportes,
    });

  it("rechaza CONSULTA antes de consultar ubicacion o abrir transaccion", async () => {
    await expect(
      registrar()(entrada, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(lectura.de).not.toHaveBeenCalled();
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("rechaza una ubicacion inexistente sin escribir", async () => {
    vi.mocked(lectura.de).mockResolvedValue(null);

    await expect(
      registrar()(entrada, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("guarda un reporte vinculado visible", async () => {
    const reporteId = "66666666-6666-4666-8666-666666666666";

    await registrar()({ ...entrada, reporteId }, contextoCon("OPERADOR"));

    expect(lecturaDeReportes.porId).toHaveBeenCalledWith({}, reporteId);
    expect(repositorio.guardar).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ reporteId }),
    );
  });

  it.each([
    ["un reporte de otro municipio", "44444444-4444-4444-8444-444444444444"],
    ["un reporte inexistente", "55555555-5555-4555-8555-555555555555"],
  ])("rechaza %s antes de guardar o auditar", async (_caso, reporteId) => {
    vi.mocked(lecturaDeReportes.porId).mockResolvedValue(false);

    await expect(
      registrar()({ ...entrada, reporteId }, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(lecturaDeReportes.porId).toHaveBeenCalledWith({}, reporteId);
    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("guarda PLANIFICADA con fecha de ocurrencia y captura asignada por servidor", async () => {
    await registrar()(entrada, contextoCon("OPERADOR"));

    const guardado = vi.mocked(repositorio.guardar).mock.calls[0]?.[1];
    expect(guardado).toEqual(
      expect.objectContaining({
        tipo: "OBRA",
        estado: "PLANIFICADA",
        fechaDeOcurrencia: "2026-01-15",
        reporteId: null,
      }),
    );
    expect(guardado).not.toHaveProperty("capturadoEn");
    const traza = registrarMock.mock.calls[0]?.[1];
    expect(traza).toEqual(
      expect.objectContaining({
        entidad: "intervenciones",
        entidadId: guardado?.id,
      }),
    );
    expect(traza).not.toHaveProperty("descripcion");
  });
});

describe("intervencionPorId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("conserva null cuando RLS no hace visible el recurso", async () => {
    const id =
      "33333333-3333-4333-8333-333333333333" as IntervencionGuardada["id"];
    const contexto = contextoCon("CONSULTA");
    const buscarPorId = vi.fn().mockResolvedValue(null);
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );

    const leer = crearIntervencionPorId({ buscarPorId });
    await expect(leer(id, contexto)).resolves.toBeNull();
    expect(withTenantMock).toHaveBeenCalledOnce();
    expect(withTenantMock).toHaveBeenCalledWith(
      contexto.ayuntamientoId,
      expect.any(Function),
    );
    expect(buscarPorId).toHaveBeenCalledWith({}, id);
  });
});
