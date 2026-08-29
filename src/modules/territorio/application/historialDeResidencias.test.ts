import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
} from "../domain";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
  ResidenciaGuardada,
} from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearHistorialDeResidencias } = await import(
  "./historialDeResidencias"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const personaId = "11111111-1111-4111-8111-111111111111";
const otraIdentidad = "22222222-2222-4222-8222-222222222222";

const residenciaGuardada: ResidenciaGuardada = {
  id: comoResidenciaId("33333333-3333-4333-8333-333333333333"),
  personaId,
  domicilioId: comoDomicilioId("44444444-4444-4444-8444-444444444444"),
  desdeEn: "2024-01-01",
  hastaEn: null,
  creadoEn: new Date("2024-01-01T00:00:00Z"),
  domicilio: {
    calleId: comoCalleId("55555555-5555-4555-8555-555555555555"),
    lugarId: comoLugarId("66666666-6666-4666-8666-666666666666"),
    numero: "10",
  },
};

describe("historialDeResidencias", () => {
  const repositorio: RepositorioDeResidencias = {
    cerrarAbierta: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };
  let lecturaDePersonas: LecturaDePersonas;
  let crearLecturaDePersonas: (contexto: ContextoActual) => LecturaDePersonas;

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    lecturaDePersonas = {
      terminalDe: vi.fn(),
      identidadesDe: vi.fn(),
    };
    crearLecturaDePersonas = vi.fn(() => lecturaDePersonas);
  });

  const historialDeResidencias = () =>
    crearHistorialDeResidencias(repositorio, crearLecturaDePersonas);

  it("identidadesDe vacio rechaza como NoEncontradoError sin abrir withTenant", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([]);

    await expect(
      historialDeResidencias()(personaId, contexto),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.historialDe).not.toHaveBeenCalled();
  });

  it("devuelve el historial de todas las identidades que colapsan en la persona", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([
      personaId,
      otraIdentidad,
    ]);
    vi.mocked(repositorio.historialDe).mockResolvedValue([residenciaGuardada]);

    const resultado = await historialDeResidencias()(personaId, contexto);

    expect(repositorio.historialDe).toHaveBeenCalledWith(expect.anything(), [
      personaId,
      otraIdentidad,
    ]);
    expect(resultado).toEqual([residenciaGuardada]);
  });

  it("no exige rol: CONSULTA puede leer el historial", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([personaId]);
    vi.mocked(repositorio.historialDe).mockResolvedValue([]);

    await expect(
      historialDeResidencias()(personaId, contexto),
    ).resolves.toEqual([]);
  });
});
