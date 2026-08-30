import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
} from "../domain";
import type { LectorDeDirecciones } from "./puertosDeDirecciones";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
  ResidenciaGuardada,
} from "./puertosDeResidencias";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearDireccionVigenteDePersona } = await import(
  "./direccionVigenteDePersona"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const personaId = "11111111-1111-4111-8111-111111111111";
const domicilioId = comoDomicilioId("44444444-4444-4444-8444-444444444444");

const residenciaAbierta: ResidenciaGuardada = {
  id: comoResidenciaId("33333333-3333-4333-8333-333333333333"),
  personaId,
  domicilioId,
  desdeEn: "2024-01-01",
  hastaEn: null,
  creadoEn: new Date("2024-01-01T00:00:00Z"),
  domicilio: {
    calleId: comoCalleId("55555555-5555-4555-8555-555555555555"),
    lugarId: comoLugarId("66666666-6666-4666-8666-666666666666"),
    numero: "10",
  },
};

const residenciaCerrada: ResidenciaGuardada = {
  ...residenciaAbierta,
  id: comoResidenciaId("77777777-7777-4777-8777-777777777777"),
  hastaEn: "2023-01-01",
};

describe("direccionVigenteDePersona", () => {
  const repositorio: RepositorioDeResidencias = {
    cerrarAbierta: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };
  const lectorDeDirecciones: LectorDeDirecciones = {
    partesDe: vi.fn(),
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

  const direccionVigenteDePersona = () =>
    crearDireccionVigenteDePersona(
      repositorio,
      lectorDeDirecciones,
      crearLecturaDePersonas,
    );

  it("identidades vacio (persona inexistente o de otro tenant) devuelve null sin abrir withTenant", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([]);

    const resultado = await direccionVigenteDePersona()(personaId, contexto);

    expect(resultado).toBeNull();
    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.historialDe).not.toHaveBeenCalled();
  });

  it("sin ninguna residencia con hastaEn nulo devuelve null sin consultar la direccion", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([personaId]);
    vi.mocked(repositorio.historialDe).mockResolvedValue([residenciaCerrada]);

    const resultado = await direccionVigenteDePersona()(personaId, contexto);

    expect(resultado).toBeNull();
    expect(lectorDeDirecciones.partesDe).not.toHaveBeenCalled();
  });

  it("partesDe null (domicilio inexistente o escondido por RLS) devuelve null", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([personaId]);
    vi.mocked(repositorio.historialDe).mockResolvedValue([residenciaAbierta]);
    vi.mocked(lectorDeDirecciones.partesDe).mockResolvedValue(null);

    const resultado = await direccionVigenteDePersona()(personaId, contexto);

    expect(resultado).toBeNull();
  });

  it("camino feliz devuelve residenciaId, domicilioId, desdeEn y el texto compuesto", async () => {
    vi.mocked(lecturaDePersonas.identidadesDe).mockResolvedValue([personaId]);
    vi.mocked(repositorio.historialDe).mockResolvedValue([residenciaAbierta]);
    vi.mocked(lectorDeDirecciones.partesDe).mockResolvedValue({
      calle: "Calle 20",
      numero: "10",
      entreCalleA: null,
      entreCalleB: null,
      referencia: null,
      ancestros: [],
    });

    const resultado = await direccionVigenteDePersona()(personaId, contexto);

    expect(resultado).toEqual({
      residenciaId: residenciaAbierta.id,
      domicilioId: residenciaAbierta.domicilioId,
      desdeEn: residenciaAbierta.desdeEn,
      texto: "Calle 20 10",
    });
    expect(
      vi.mocked(lecturaDePersonas.identidadesDe).mock.invocationCallOrder[0],
    ).toBeLessThan(withTenantMock.mock.invocationCallOrder[0]!);
  });
});
