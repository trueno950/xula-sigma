import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoLugarId, type LugarId } from "../domain";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeLugares,
} from "./puertos";
import type { LectorDeCallesDeMapa } from "./puertosDeLecturaDeCalles";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarCallesDelMunicipio } = await import(
  "./listarCallesDelMunicipio"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const motulId = comoLugarId("11111111-1111-4111-8111-111111111111");
const ticulId = comoLugarId("22222222-2222-4222-8222-222222222222");
const sinLugarId = comoLugarId("33333333-3333-4333-8333-333333333333");

const calle = (
  nombre: string,
  lugarId: LugarId,
  bajaEn: Date | null = null,
): CalleGuardada => ({
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre,
  lugarId,
  punto: null,
  bajaEn,
});

const lugar = (
  id: LugarId,
  tipo: LugarGuardado["tipo"],
  nombre: string,
): LugarGuardado => ({ id, tipo, nombre, padreId: null, bajaEn: null });

describe("listarCallesDelMunicipio", () => {
  const lector: LectorDeCallesDeMapa = {
    listarParaMapa: vi.fn(),
    leerConEventos: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("devuelve las calles activas rotuladas con su asentamiento y ordenadas", async () => {
    vi.mocked(lector.listarParaMapa).mockResolvedValue([
      calle("Calle 21", ticulId),
      calle("Calle 20", motulId),
    ]);
    vi.mocked(repositorioDeLugares.listarLugares).mockResolvedValue([
      lugar(motulId, "cabecera", "Motul"),
      lugar(ticulId, "comisaria", "Ticul"),
    ]);

    const listarCallesDelMunicipio = crearListarCallesDelMunicipio(
      lector,
      repositorioDeLugares,
    );
    const calles = await listarCallesDelMunicipio(contexto);

    expect(
      calles.map(({ nombre, asentamiento }) => [nombre, asentamiento]),
    ).toEqual([
      ["Calle 20", "Motul"],
      ["Calle 21", "Ticul"],
    ]);
  });

  it("omite las calles de baja y las que no tienen asentamiento activo", async () => {
    vi.mocked(lector.listarParaMapa).mockResolvedValue([
      calle("Calle vigente", motulId),
      calle("Calle de baja", motulId, new Date("2026-01-01T00:00:00.000Z")),
      calle("Calle huerfana", sinLugarId),
    ]);
    vi.mocked(repositorioDeLugares.listarLugares).mockResolvedValue([
      lugar(motulId, "cabecera", "Motul"),
    ]);

    const listarCallesDelMunicipio = crearListarCallesDelMunicipio(
      lector,
      repositorioDeLugares,
    );
    const calles = await listarCallesDelMunicipio(contexto);

    expect(calles.map(({ nombre }) => nombre)).toEqual(["Calle vigente"]);
  });
});
