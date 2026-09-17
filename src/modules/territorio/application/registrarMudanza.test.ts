import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoDomicilioId, comoResidenciaId } from "../domain";
import type {
  DomicilioGuardado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
} from "./puertosDeResidencias";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const hoyEnMeridaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

vi.mock("@/shared/lib/fecha", () => ({
  hoyEnMerida: hoyEnMeridaMock,
}));

const { crearRegistrarMudanza } = await import("./registrarMudanza");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const personaId = "11111111-1111-4111-8111-111111111111";
const terminal = "22222222-2222-4222-8222-222222222222";
const domicilioId = comoDomicilioId("33333333-3333-4333-8333-333333333333");
const residenciaCerradaId = comoResidenciaId(
  "44444444-4444-4444-8444-444444444444",
);
const residenciaAbiertaId = comoResidenciaId(
  "55555555-5555-4555-8555-555555555555",
);

/**
 * `registrarMudanza` solo necesita saber que el domicilio existe -no lee
 * ninguno de sus campos-, asi que el resto de `DomicilioGuardado` no
 * importa para este test.
 */
const domicilioGuardado = { id: domicilioId } as DomicilioGuardado;

describe("registrarMudanza", () => {
  const repositorio: RepositorioDeResidencias = {
    cerrarAbierta: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };
  const repositorioDeDomicilios: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    listar: vi.fn(),
  };

  let ordenDeLlamadas: string[];
  let lecturaDePersonas: LecturaDePersonas;
  let crearLecturaDePersonas: (contexto: ContextoActual) => LecturaDePersonas;

  beforeEach(() => {
    vi.resetAllMocks();
    ordenDeLlamadas = [];
    hoyEnMeridaMock.mockReturnValue("2020-06-15");
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => {
        ordenDeLlamadas.push("withTenant");
        return trabajo({});
      },
    );
    vi.mocked(repositorioDeDomicilios.buscarPorId).mockResolvedValue(
      domicilioGuardado,
    );
    lecturaDePersonas = {
      terminalDe: vi.fn(async (id: string) => {
        ordenDeLlamadas.push("terminalDe");
        return id === personaId ? terminal : null;
      }),
      identidadesDe: vi.fn(),
    };
    crearLecturaDePersonas = vi.fn(() => lecturaDePersonas);
  });

  const registrarMudanza = () =>
    crearRegistrarMudanza(
      repositorio,
      repositorioDeDomicilios,
      crearLecturaDePersonas,
    );

  it("rechaza sin puedeEscribir y no consulta el terminal ni abre transaccion", async () => {
    await expect(
      registrarMudanza()(personaId, domicilioId, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(crearLecturaDePersonas).not.toHaveBeenCalled();
    expect(withTenantMock).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("terminalDe null rechaza como NoEncontradoError antes de abrir withTenant", async () => {
    vi.mocked(lecturaDePersonas.terminalDe).mockResolvedValue(null);

    await expect(
      registrarMudanza()("no-existe", domicilioId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.abrir).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("un domicilioId de otro tenant o inexistente rechaza como NoEncontradoError sin abrir ni cerrar", async () => {
    vi.mocked(repositorioDeDomicilios.buscarPorId).mockResolvedValue(null);

    await expect(
      registrarMudanza()(personaId, domicilioId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.abrir).not.toHaveBeenCalled();
    expect(repositorio.cerrarAbierta).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("el orden de llamada es: primero terminalDe, despues withTenant", async () => {
    vi.mocked(repositorio.cerrarAbierta).mockResolvedValue(null);
    vi.mocked(repositorio.abrir).mockResolvedValue(residenciaAbiertaId);

    await registrarMudanza()(personaId, domicilioId, contextoCon("OPERADOR"));

    expect(ordenDeLlamadas).toEqual(["terminalDe", "withTenant"]);
  });

  it("mudanza sin residencia previa abierta: una sola traza ABRIR_RESIDENCIA", async () => {
    vi.mocked(repositorio.cerrarAbierta).mockResolvedValue(null);
    vi.mocked(repositorio.abrir).mockResolvedValue(residenciaAbiertaId);

    const { id } = await registrarMudanza()(
      personaId,
      domicilioId,
      contextoCon("OPERADOR"),
    );

    expect(id).toBe(residenciaAbiertaId);
    expect(repositorio.abrir).toHaveBeenCalledWith(expect.anything(), {
      ayuntamientoId: "motul",
      personaId: terminal,
      domicilioId,
      desdeEn: "2020-06-15",
    });
    expect(registrarMock).toHaveBeenCalledTimes(1);
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "ABRIR_RESIDENCIA",
        entidad: "residencias",
        entidadId: residenciaAbiertaId,
      }),
    );
  });

  it("mudanza con residencia previa abierta: cierra y abre, se opera sobre el terminal y no sobre lo que mando la UI", async () => {
    vi.mocked(repositorio.cerrarAbierta).mockResolvedValue(residenciaCerradaId);
    vi.mocked(repositorio.abrir).mockResolvedValue(residenciaAbiertaId);

    await registrarMudanza()(personaId, domicilioId, contextoCon("OPERADOR"));

    expect(repositorio.cerrarAbierta).toHaveBeenCalledWith(
      expect.anything(),
      terminal,
      "2020-06-15",
    );
    expect(repositorio.abrir).toHaveBeenCalledWith(expect.anything(), {
      ayuntamientoId: "motul",
      personaId: terminal,
      domicilioId,
      desdeEn: "2020-06-15",
    });
    expect(registrarMock).toHaveBeenCalledTimes(2);
    expect(registrarMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        accion: "CERRAR_RESIDENCIA",
        entidad: "residencias",
        entidadId: residenciaCerradaId,
      }),
    );
    expect(registrarMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        accion: "ABRIR_RESIDENCIA",
        entidad: "residencias",
        entidadId: residenciaAbiertaId,
      }),
    );
  });
});
