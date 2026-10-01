import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoConstanciaId, comoReimpresionId } from "../domain";
import type { ConstanciaGuardada, RepositorioDeConstancias } from "./puertos";
import type { LecturaDeAyuntamiento } from "./puertosDeLectura";
import type { RenderizadorDeConstancias } from "./puertosDeRender";

/**
 * Que `cancelada` llegue al renderizador desde la fila de la constancia.
 * Aparte de `pdfDeConstancia.test.ts` por el limite de 200 lineas de
 * `AGENTS.md`; mismo patron de puertos mockeados y renderizador falso.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearPdfDeConstancia } = await import("./pdfDeConstancia");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "OPERADOR" },
  origen: "web",
};

const constanciaId = comoConstanciaId("11111111-1111-4111-8111-111111111111");
const reimpresionId = comoReimpresionId("22222222-2222-4222-8222-222222222222");

const vigente: ConstanciaGuardada = {
  id: constanciaId,
  ayuntamientoId: contexto.ayuntamientoId,
  tipo: "VECINDAD",
  folio: "VEC-2026-000001",
  anio: 2026,
  consecutivo: 1,
  codigoVerificacion: "abc123",
  personaId: "44444444-4444-4444-8444-444444444444",
  datos: {
    titular: { nombreCompleto: "Juan Poot" },
    direccion: {
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
  plantillaVersion: "vecindad-v1",
  emitidaPorUsuarioId: "usuario-1",
  emitidaEn: new Date("2026-01-01T00:00:00Z"),
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
};

const cancelada: ConstanciaGuardada = {
  ...vigente,
  canceladaEn: new Date("2026-02-01T00:00:00Z"),
  canceladaPorUsuarioId: "usuario-1",
  motivoCancelacion: "ERROR_DE_CAPTURA",
};

describe("pdfDeConstancia y el estado de cancelacion", () => {
  const repositorio = {
    buscarPorId: vi.fn(),
    existeReimpresion: vi.fn(),
  } as unknown as RepositorioDeConstancias;
  const lecturaDeAyuntamiento: LecturaDeAyuntamiento = {
    porId: vi.fn().mockResolvedValue({ nombre: "Motul", subdominio: "motul" }),
  };
  const renderizador: RenderizadorDeConstancias = {
    aPdf: vi.fn().mockResolvedValue(new Uint8Array([1])),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  const generar = (reimpresion?: string) =>
    crearPdfDeConstancia(
      repositorio,
      lecturaDeAyuntamiento,
      renderizador,
    )(
      {
        id: constanciaId,
        ...(reimpresion ? { reimpresionId: reimpresion } : {}),
      },
      contexto,
    );

  it("una constancia vigente llega al renderizador con cancelada: false", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(vigente);

    await generar();

    expect(renderizador.aPdf).toHaveBeenCalledWith(
      expect.objectContaining({ cancelada: false }),
    );
  });

  it("una constancia cancelada llega con cancelada: true", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(cancelada);

    await generar();

    expect(renderizador.aPdf).toHaveBeenCalledWith(
      expect.objectContaining({ cancelada: true }),
    );
  });

  it("una reimpresion acreditada no esquiva la marca de una constancia cancelada", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(cancelada);
    vi.mocked(repositorio.existeReimpresion).mockResolvedValue(true);

    await generar(reimpresionId);

    expect(renderizador.aPdf).toHaveBeenCalledWith(
      expect.objectContaining({ cancelada: true, reimpresion: true }),
    );
  });
});
