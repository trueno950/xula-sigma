import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoConstanciaId } from "../domain";
import type { RepositorioDeConstancias } from "./puertos";

/**
 * Puertos mockeados, mismo patron que `reimprimirConstancia.test.ts`. La
 * prueba real del `UPDATE ... WHERE cancelada_en IS NULL` contra Postgres es
 * `reimpresionYCancelacion.integration.test.ts`.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));
vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearCancelarConstancia } = await import("./cancelarConstancia");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const constanciaId = comoConstanciaId("11111111-1111-4111-8111-111111111111");

describe("cancelarConstancia", () => {
  const repositorio: RepositorioDeConstancias = {
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
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

  const cancelarConstancia = () => crearCancelarConstancia(repositorio);

  it("rechaza sin puedeAdministrarDocumentos(rol) antes de abrir withTenant", async () => {
    await expect(
      cancelarConstancia()(
        constanciaId,
        "ERROR_DE_CAPTURA",
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.cancelar).not.toHaveBeenCalled();
  });

  it("un OPERADOR que emitio el documento tampoco puede cancelar -no hay excepcion por haber sido quien emitio-", async () => {
    await expect(
      cancelarConstancia()(
        constanciaId,
        "ERROR_DE_CAPTURA",
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(repositorio.cancelar).not.toHaveBeenCalled();
  });

  it("CONSULTA tampoco puede cancelar", async () => {
    await expect(
      cancelarConstancia()(
        constanciaId,
        "ERROR_DE_CAPTURA",
        contextoCon("CONSULTA"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
  });

  it.each([
    ["inexistente", false],
    ["de otro tenant", false],
    ["ya cancelada", false],
  ])(
    "UPDATE sin fila afectada (%s) -> NoEncontradoError, las tres tratadas igual",
    async (_caso, afectoAlguna) => {
      vi.mocked(repositorio.cancelar).mockResolvedValue(afectoAlguna);

      await expect(
        cancelarConstancia()(
          constanciaId,
          "ERROR_DE_CAPTURA",
          contextoCon("ADMIN_MUNICIPAL"),
        ),
      ).rejects.toBeInstanceOf(NoEncontradoError);
    },
  );

  it("camino feliz: cancelar recibe id, motivo y usuarioId en la misma sentencia, registrar recibe CANCELAR_CONSTANCIA", async () => {
    vi.mocked(repositorio.cancelar).mockResolvedValue(true);

    await cancelarConstancia()(
      constanciaId,
      "SOLICITUD_DEL_INTERESADO",
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.cancelar).toHaveBeenCalledWith(expect.anything(), {
      id: constanciaId,
      motivo: "SOLICITUD_DEL_INTERESADO",
      usuarioId: "usuario-1",
    });

    expect(registrarMock).toHaveBeenCalledTimes(1);
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "CANCELAR_CONSTANCIA",
        entidad: "constancias",
        entidadId: constanciaId,
      }),
    );
  });
});
