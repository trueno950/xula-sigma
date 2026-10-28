import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { UbicacionInvalidaError } from "../domain";
import type { RepositorioDeReportes } from "./puertos";
import type { LecturaDeDomicilios } from "./puertosDeDomicilios";
import type {
  LecturaDeReportantes,
  LecturaDeUbicaciones,
} from "./puertosDeLectura";
import type {
  ContadorDeFolios,
  RegistroDeMovimientos,
} from "./puertosDeMovimientos";
import type { EntradaDeRegistroDeReporte } from "./registrarReporte";
import { crearRegistrarReporte } from "./registrarReporte";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const tx = { execute: vi.fn() };

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));

const domicilioId = "22222222-2222-4222-8222-222222222222";
const lugarId = "33333333-3333-4333-8333-333333333333";
const calleId = "44444444-4444-4444-8444-444444444444";
const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};
const ubicaciones: LecturaDeUbicaciones = { de: vi.fn() };
const reportantes: LecturaDeReportantes = { porId: vi.fn() };
const domicilios: LecturaDeDomicilios = { porId: vi.fn() };
const repositorio: Pick<RepositorioDeReportes, "guardar"> = {
  guardar: vi.fn(),
};
const contador: ContadorDeFolios = { siguiente: vi.fn() };
const movimientos: RegistroDeMovimientos = {
  agregar: vi.fn(),
  historialDe: vi.fn(),
};
const crearLecturaDeUbicaciones = (_contexto: ContextoActual) => ubicaciones;
const crearLecturaDeReportantes = (_contexto: ContextoActual) => reportantes;
const crearLecturaDeDomicilios = (_contexto: ContextoActual) => domicilios;

const entrada = (
  parcial: Partial<EntradaDeRegistroDeReporte> = {},
): EntradaDeRegistroDeReporte => ({
  tipo: "BACHE",
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
  ...parcial,
});

const registrar = () =>
  crearRegistrarReporte({
    repositorio,
    contador,
    movimientos,
    crearLecturaDeUbicaciones,
    crearLecturaDeReportantes,
    crearLecturaDeDomicilios,
  });

beforeEach(() => {
  vi.resetAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo(tx),
  );
});

describe("ubicación enlazada al registrar un reporte", () => {
  it("domicilio no encontrado rechaza antes de contador, escritura e historial", async () => {
    vi.mocked(domicilios.porId).mockResolvedValue(null);

    await expect(
      registrar()(entrada({ domicilioId }), contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(ubicaciones.de).not.toHaveBeenCalled();
    expect(contador.siguiente).not.toHaveBeenCalled();
    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(movimientos.agregar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("deriva lugar y calle del domicilio activo y conserva su vínculo", async () => {
    vi.mocked(domicilios.porId).mockResolvedValue({ lugarId, calleId });
    vi.mocked(ubicaciones.de).mockResolvedValue({ texto: "Calle 20" });
    vi.mocked(contador.siguiente).mockResolvedValue(1);

    await registrar()(entrada({ domicilioId }), contexto);

    expect(domicilios.porId).toHaveBeenCalledWith(domicilioId);
    expect(ubicaciones.de).toHaveBeenCalledWith(lugarId, calleId);
    expect(vi.mocked(repositorio.guardar).mock.calls[0]?.[1]).toMatchObject({
      domicilioId,
      lugarId,
      calleId,
    });
  });

  it("rechaza lugar o calle de cliente inconsistentes antes del contador", async () => {
    vi.mocked(domicilios.porId).mockResolvedValue({ lugarId, calleId });

    await expect(
      registrar()(
        entrada({
          domicilioId,
          lugarId: "55555555-5555-4555-8555-555555555555",
          calleId: "66666666-6666-4666-8666-666666666666",
        }),
        contexto,
      ),
    ).rejects.toBeInstanceOf(UbicacionInvalidaError);

    expect(contador.siguiente).not.toHaveBeenCalled();
    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(movimientos.agregar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });
});
