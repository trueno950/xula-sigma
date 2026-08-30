import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  comoConstanciaId,
  DocumentoCanceladoError,
  type MotivoDeReimpresion,
} from "../domain";
import type { ConstanciaGuardada, RepositorioDeConstancias } from "./puertos";

/**
 * Puertos mockeados, mismo patron que `emitirConstancia.test.ts`:
 * `withTenant` y `registrar` se mockean para que la prueba no toque
 * Postgres. La prueba real contra la base es
 * `reimprimirConstancia.integration.test.ts` (tasks.md Fase 6, 6.6-6.13).
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));
vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearReimprimirConstancia } = await import("./reimprimirConstancia");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const constanciaId = comoConstanciaId("11111111-1111-4111-8111-111111111111");

const constanciaGuardada = (canceladaEn: Date | null): ConstanciaGuardada => ({
  id: constanciaId,
  ayuntamientoId: "motul" as ConstanciaGuardada["ayuntamientoId"],
  tipo: "VECINDAD",
  folio: "VEC-2026-000001",
  anio: 2026,
  consecutivo: 1,
  codigoVerificacion: "a1b2c3d4e5f60718",
  personaId: "persona-1",
  datos: {},
  plantillaVersion: "vecindad-v1",
  emitidaPorUsuarioId: "usuario-0",
  emitidaEn: new Date("2026-01-01T00:00:00Z"),
  canceladaEn,
  canceladaPorUsuarioId: canceladaEn ? "usuario-2" : null,
  motivoCancelacion: canceladaEn ? "ERROR_DE_CAPTURA" : null,
});

describe("reimprimirConstancia", () => {
  const repositorio: RepositorioDeConstancias = {
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    listar: vi.fn(),
    paraValidar: vi.fn(),
    registrarReimpresion: vi.fn(),
    existeReimpresion: vi.fn(),
    cancelar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  const reimprimirConstancia = () => crearReimprimirConstancia(repositorio);

  it("rechaza sin puedeEscribir(rol) antes de abrir withTenant", async () => {
    await expect(
      reimprimirConstancia()(constanciaId, "EXTRAVIO", contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.registrarReimpresion).not.toHaveBeenCalled();
  });

  it("id inexistente -> NoEncontradoError", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      reimprimirConstancia()(constanciaId, "EXTRAVIO", contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.registrarReimpresion).not.toHaveBeenCalled();
  });

  // Sin test separado de "id de otro tenant": a nivel de caso de uso es
  // indistinguible de "id inexistente" -RLS lo oculta antes de que
  // `bloquearPorId` devuelva la fila, asi que el mock no puede ejercitar esa
  // rama, solo simularla-. El aislamiento real lo prueba el isolation test
  // contra Postgres, no un mock aca (hallazgo de GGA en la revision de esta
  // rebanada: mismo criterio ya aplicado al test eliminado de
  // `cancelarConstancia.test.ts`).

  it("constancia cancelada -> DocumentoCanceladoError, sin registrar reimpresion", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(
      constanciaGuardada(new Date("2026-02-01T00:00:00Z")),
    );

    await expect(
      reimprimirConstancia()(constanciaId, "EXTRAVIO", contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(DocumentoCanceladoError);

    expect(repositorio.registrarReimpresion).not.toHaveBeenCalled();
  });

  it("un motivo fuera de MOTIVOS_DE_REIMPRESION lo rechaza el tipo, no el runtime", () => {
    // La union cerrada `MotivoDeReimpresion` no acepta un literal ajeno:
    // este es un assert de compilacion, no de ejecucion -si el
    // `@ts-expect-error` deja de ser necesario, `tsc` falla la build.
    // @ts-expect-error "PERDIDA" no pertenece a MOTIVOS_DE_REIMPRESION
    const motivoAjeno: MotivoDeReimpresion = "PERDIDA";
    expect(motivoAjeno).toBe("PERDIDA");
  });

  it("camino feliz: registrarReimpresion recibe {constanciaId, usuarioId, motivo}, registrar recibe REIMPRIMIR_CONSTANCIA con solo ids, devuelve el reimpresionId", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(
      constanciaGuardada(null),
    );
    const reimpresionId = "22222222-2222-4222-8222-222222222222";
    vi.mocked(repositorio.registrarReimpresion).mockResolvedValue(
      reimpresionId as never,
    );

    const resultado = await reimprimirConstancia()(
      constanciaId,
      "DETERIORO",
      contextoCon("OPERADOR"),
    );

    expect(resultado).toBe(reimpresionId);
    expect(repositorio.registrarReimpresion).toHaveBeenCalledWith(
      expect.anything(),
      {
        ayuntamientoId: "motul",
        constanciaId,
        usuarioId: "usuario-1",
        motivo: "DETERIORO",
      },
    );

    expect(registrarMock).toHaveBeenCalledTimes(1);
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "REIMPRIMIR_CONSTANCIA",
        entidad: "constancias",
        entidadId: constanciaId,
      }),
    );
  });
});
