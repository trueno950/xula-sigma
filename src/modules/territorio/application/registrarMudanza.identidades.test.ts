import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  comoDomicilioId,
  comoResidenciaId,
  MudanzaConcurrenteError,
} from "../domain";
import type {
  DomicilioGuardado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";
import type {
  LecturaDePersonas,
  RepositorioDeResidencias,
} from "./puertosDeResidencias";

const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
}));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/lib/fecha", () => ({ hoyEnMerida: () => "2020-06-15" }));

const { crearRegistrarMudanza } = await import("./registrarMudanza");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const ganadora = "22222222-2222-4222-8222-222222222222";
const perdedora = "11111111-1111-4111-8111-111111111111";
const domicilioId = comoDomicilioId("33333333-3333-4333-8333-333333333333");
const cerradaDeGanadora = comoResidenciaId(
  "44444444-4444-4444-8444-444444444444",
);
const cerradaDePerdedora = comoResidenciaId(
  "66666666-6666-4666-8666-666666666666",
);
const nueva = comoResidenciaId("55555555-5555-4555-8555-555555555555");

describe("registrarMudanza de una persona fusionada", () => {
  const repositorio: RepositorioDeResidencias = {
    cerrarAbiertas: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };
  const repositorioDeDomicilios = {
    bloquearPorId: vi.fn(),
  } as unknown as RepositorioDeDomicilios;
  const lectura: LecturaDePersonas = {
    terminalDe: vi.fn(),
    identidadesDe: vi.fn(),
  };

  const registrarMudanza = crearRegistrarMudanza(
    repositorio,
    repositorioDeDomicilios,
    () => lectura,
  );

  beforeEach(() => {
    vi.mocked(repositorio.cerrarAbiertas).mockReset();
    vi.mocked(repositorio.abrir).mockReset();
    registrarMock.mockReset();
    vi.mocked(lectura.terminalDe).mockResolvedValue(ganadora);
    vi.mocked(lectura.identidadesDe).mockResolvedValue([ganadora, perdedora]);
    vi.mocked(repositorioDeDomicilios.bloquearPorId).mockResolvedValue({
      id: domicilioId,
      bajaEn: null,
    } as DomicilioGuardado);
  });

  it("cierra las residencias abiertas de todas las identidades que colapsan en la persona", async () => {
    vi.mocked(repositorio.cerrarAbiertas).mockResolvedValue([
      cerradaDeGanadora,
      cerradaDePerdedora,
    ]);
    vi.mocked(repositorio.abrir).mockResolvedValue(nueva);

    await registrarMudanza(perdedora, domicilioId, contexto);

    expect(lectura.identidadesDe).toHaveBeenCalledWith(ganadora);
    expect(repositorio.cerrarAbiertas).toHaveBeenCalledWith(
      expect.anything(),
      [ganadora, perdedora],
      "2020-06-15",
    );
    expect(repositorio.abrir).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ personaId: ganadora }),
    );
  });

  it("deja una traza CERRAR_RESIDENCIA por cada residencia cerrada y despues la de apertura", async () => {
    vi.mocked(repositorio.cerrarAbiertas).mockResolvedValue([
      cerradaDeGanadora,
      cerradaDePerdedora,
    ]);
    vi.mocked(repositorio.abrir).mockResolvedValue(nueva);

    await registrarMudanza(perdedora, domicilioId, contexto);

    const trazas = registrarMock.mock.calls.map(([, traza]) => [
      traza.accion,
      traza.entidadId,
    ]);
    expect(trazas).toEqual([
      ["CERRAR_RESIDENCIA", cerradaDeGanadora],
      ["CERRAR_RESIDENCIA", cerradaDePerdedora],
      ["ABRIR_RESIDENCIA", nueva],
    ]);
  });

  it("una mudanza simultanea de la misma persona llega como MudanzaConcurrenteError, sin traza de apertura", async () => {
    vi.mocked(repositorio.cerrarAbiertas).mockResolvedValue([]);
    vi.mocked(repositorio.abrir).mockRejectedValue(
      new MudanzaConcurrenteError(),
    );

    await expect(
      registrarMudanza(perdedora, domicilioId, contexto),
    ).rejects.toBeInstanceOf(MudanzaConcurrenteError);

    expect(registrarMock).not.toHaveBeenCalled();
  });
});
