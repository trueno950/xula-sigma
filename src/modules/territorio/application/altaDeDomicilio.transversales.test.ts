import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { comoCalleId, comoLugarId } from "../domain";
import type { NuevoDomicilio } from "./altaDeDomicilio";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeDomicilio } = await import("./altaDeDomicilio");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const asentamientoId = comoLugarId("11111111-1111-4111-8111-111111111111");
const lugarId = comoLugarId("66666666-6666-4666-8666-666666666666");
const calleId = comoCalleId("22222222-2222-4222-8222-222222222222");
const entreCalleAId = comoCalleId("33333333-3333-4333-8333-333333333333");

const lugarGuardado: LugarGuardado = {
  id: lugarId,
  tipo: "colonia",
  nombre: "Colonia de prueba",
  padreId: asentamientoId,
  bajaEn: null,
};

const asentamientoGuardado: LugarGuardado = {
  id: asentamientoId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};

const calleGuardada: CalleGuardada = {
  id: calleId,
  nombre: "Calle 21",
  lugarId: asentamientoId,
  punto: null,
  bajaEn: null,
};

const repositorio: RepositorioDeDomicilios = {
  crear: vi.fn(),
  buscarPorId: vi.fn(),
  porLugarYSubarbol: vi.fn(),
  porCalle: vi.fn(),
  listar: vi.fn(),
};

const repositorioDeLugares: RepositorioDeLugares = {
  crear: vi.fn(),
  buscarPorId: vi.fn(),
  actualizar: vi.fn(),
  contarHijosActivos: vi.fn(),
  contarDomiciliosColgados: vi.fn(),
  subarbol: vi.fn(),
  listarRaices: vi.fn(),
  listarLugares: vi.fn(),
};

const repositorioDeCalles: RepositorioDeCalles = {
  crear: vi.fn(),
  buscarPorId: vi.fn(),
  bloquearPorId: vi.fn(),
  actualizar: vi.fn(),
  contarDomiciliosQueLaUsan: vi.fn(),
  listarPorLugar: vi.fn(),
  registrarEventoDeAlta: vi.fn(),
  registrarEventoDeRenombre: vi.fn(),
  registrarEventoDeReparenteo: vi.fn(),
  registrarEventoDeUbicacion: vi.fn(),
};

const datos: NuevoDomicilio = {
  lugarId,
  calleId,
  numero: "21",
  entreCalleAId,
  entreCalleBId: null,
  referencia: null,
};

describe("altaDeDomicilio: calles inactivas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorioDeLugares.buscarPorId).mockImplementation(
      async (_tx, id) =>
        id === lugarId ? lugarGuardado : asentamientoGuardado,
    );
    vi.mocked(repositorioDeCalles.bloquearPorId).mockImplementation(
      async (_tx, id) =>
        id === calleId
          ? calleGuardada
          : {
              ...calleGuardada,
              id: entreCalleAId,
              bajaEn: new Date("2026-01-01T00:00:00.000Z"),
            },
    );
  });

  it("rechaza una transversal dada de baja sin insertar domicilio ni bitacora", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(
      repositorio,
      repositorioDeLugares,
      repositorioDeCalles,
    );

    await expect(altaDeDomicilio(datos, contexto)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });
});
