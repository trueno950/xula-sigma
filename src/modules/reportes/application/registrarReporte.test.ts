import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { ReportanteDadoDeBajaError, UbicacionInvalidaError } from "../domain";
import type { RepositorioDeReportes } from "./puertos";
import type {
  LecturaDeReportantes,
  LecturaDeUbicaciones,
} from "./puertosDeLectura";
import type {
  ContadorDeFolios,
  RegistroDeMovimientos,
} from "./puertosDeMovimientos";

/**
 * Puertos mockeados, mismo patron que `constancias/application/
 * emitirConstancia.test.ts`: las lecturas de otro modulo entran como una
 * fabrica `(contexto) => puerto`, y `withTenant`/`registrar` se mockean para
 * correr la transaccion en linea. La prueba real del contador contra
 * Postgres es `folio.integration.test.ts`, no este archivo.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const tx = { execute: vi.fn() };

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));
vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearRegistrarReporte } = await import("./registrarReporte");
type EntradaDeRegistroDeReporte = Parameters<
  ReturnType<typeof crearRegistrarReporte>
>[0];

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const entradaCon = (
  parcial: Partial<EntradaDeRegistroDeReporte> = {},
): EntradaDeRegistroDeReporte => ({
  tipo: "BACHE",
  lugarId: "11111111-1111-4111-8111-111111111111",
  calleId: null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
  ...parcial,
});

describe("registrarReporte", () => {
  const repositorio: Pick<RepositorioDeReportes, "guardar"> = {
    guardar: vi.fn(),
  };
  const contador: ContadorDeFolios = { siguiente: vi.fn() };
  const movimientos: RegistroDeMovimientos = {
    agregar: vi.fn(),
    historialDe: vi.fn(),
  };

  let lecturaDeUbicaciones: LecturaDeUbicaciones;
  let lecturaDeReportantes: LecturaDeReportantes;
  let crearLecturaDeUbicaciones: (c: ContextoActual) => LecturaDeUbicaciones;
  let crearLecturaDeReportantes: (c: ContextoActual) => LecturaDeReportantes;

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo(tx),
    );
    lecturaDeUbicaciones = { de: vi.fn() };
    lecturaDeReportantes = { porId: vi.fn() };
    crearLecturaDeUbicaciones = vi.fn(() => lecturaDeUbicaciones);
    crearLecturaDeReportantes = vi.fn(() => lecturaDeReportantes);
  });

  const registrarReporte = () =>
    crearRegistrarReporte({
      repositorio,
      contador,
      movimientos,
      crearLecturaDeUbicaciones,
      crearLecturaDeReportantes,
    });

  it("rechaza sin puedeEscribir(rol) antes de llamar cualquier puerto", async () => {
    await expect(
      registrarReporte()(entradaCon(), contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(crearLecturaDeUbicaciones).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("ubicacion null -> UbicacionInvalidaError, sin abrir withTenant ni tocar el contador", async () => {
    vi.mocked(lecturaDeUbicaciones.de).mockResolvedValue(null);

    await expect(
      registrarReporte()(entradaCon(), contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(UbicacionInvalidaError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
  });

  it("con personaId null nunca se invoca la lectura de reportantes", async () => {
    vi.mocked(lecturaDeUbicaciones.de).mockResolvedValue({ texto: "Calle 20" });
    vi.mocked(contador.siguiente).mockResolvedValue(1);

    await registrarReporte()(entradaCon(), contextoCon("OPERADOR"));

    expect(crearLecturaDeReportantes).not.toHaveBeenCalled();
    expect(lecturaDeReportantes.porId).not.toHaveBeenCalled();
  });

  it("personaId presente y reportante inexistente -> NoEncontradoError", async () => {
    vi.mocked(lecturaDeUbicaciones.de).mockResolvedValue({ texto: "Calle 20" });
    vi.mocked(lecturaDeReportantes.porId).mockResolvedValue(null);

    await expect(
      registrarReporte()(
        entradaCon({ personaId: "11111111-1111-4111-8111-111111111111" }),
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(contador.siguiente).not.toHaveBeenCalled();
  });

  it("reportante dado de baja -> ReportanteDadoDeBajaError, sin tocar el contador", async () => {
    vi.mocked(lecturaDeUbicaciones.de).mockResolvedValue({ texto: "Calle 20" });
    vi.mocked(lecturaDeReportantes.porId).mockResolvedValue({
      nombreCompleto: "Juan Poot",
      bajaEn: new Date("2024-01-01T00:00:00Z"),
    });

    await expect(
      registrarReporte()(
        entradaCon({ personaId: "11111111-1111-4111-8111-111111111111" }),
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(ReportanteDadoDeBajaError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
  });

  it("camino feliz: guardar recibe estado RECIBIDO, la fila del alta en movimientos y la traza en la misma transaccion", async () => {
    vi.mocked(lecturaDeUbicaciones.de).mockResolvedValue({ texto: "Calle 20" });
    vi.mocked(lecturaDeReportantes.porId).mockResolvedValue({
      nombreCompleto: "Juan Poot",
      bajaEn: null,
    });
    vi.mocked(contador.siguiente).mockResolvedValue(1);

    await registrarReporte()(
      entradaCon({ personaId: "11111111-1111-4111-8111-111111111111" }),
      contextoCon("OPERADOR"),
    );

    expect(withTenantMock).toHaveBeenCalledTimes(1);

    const guardado = vi.mocked(repositorio.guardar).mock.calls[0]?.[1];
    expect(guardado?.estado).toBe("RECIBIDO");
    expect(guardado?.areaResponsable).toBeNull();
    expect(guardado?.tipo).toBe("BACHE");
    expect(guardado?.folio).toMatch(/^REP-\d{4}-000001$/);
    expect(guardado?.personaId).toBe("11111111-1111-4111-8111-111111111111");
    expect(guardado?.domicilioId).toBeNull();

    const movimiento = vi.mocked(movimientos.agregar).mock.calls[0]?.[1];
    expect(movimiento?.estadoAnterior).toBeNull();
    expect(movimiento?.estadoNuevo).toBe("RECIBIDO");

    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "REGISTRAR_REPORTE",
        entidad: "reportes",
        entidadId: guardado?.id,
      }),
    );

    // Las dos lecturas que pueden rechazar ocurren antes del contador.
    expect(
      vi.mocked(lecturaDeUbicaciones.de).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(contador.siguiente).mock.invocationCallOrder[0]!);
    expect(
      vi.mocked(lecturaDeReportantes.porId).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(contador.siguiente).mock.invocationCallOrder[0]!);
  });
});
