import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId } from "../domain";
import type { DatosDeEdicionDeLugar, RepositorioDeLugares } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearEditarLugar } = await import("./editarLugar");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const sectorId = comoLugarId("11111111-1111-4111-8111-111111111111");
const comisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");

describe("editarLugar", () => {
  const repositorio: RepositorioDeLugares = {
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

  it("rechaza sin puedeEscribir y no abre transaccion ni escribe", async () => {
    const editarLugar = crearEditarLugar(repositorio);

    await expect(
      editarLugar(
        { id: sectorId, nombre: "Sector 3-A" },
        contextoCon("CONSULTA"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza si el lugar no existe (RLS lo esconde igual que un id ajeno)", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const editarLugar = crearEditarLugar(repositorio);

    await expect(
      editarLugar(
        { id: sectorId, nombre: "Sector 3-A" },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("renombra sin tocar el padre existente", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue({
      id: sectorId,
      tipo: "sector",
      nombre: "Sector 3",
      padreId: comisariaId,
      bajaEn: null,
    });
    const editarLugar = crearEditarLugar(repositorio);

    await editarLugar(
      { id: sectorId, nombre: "Sector 3-A" },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: sectorId,
      nombre: "Sector 3-A",
      padreId: comisariaId,
      bajaEn: null,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accion: "EDITAR_LUGAR", entidadId: sectorId }),
    );
  });
});

/**
 * Assertion de tipo, no de runtime: `vitest` no evalua `@ts-expect-error`,
 * asi que esto se prueba solo si `tsc --noEmit` corre (`pnpm check`, no
 * `pnpm test`). `DatosDeEdicionDeLugar` no tiene campo `tipo` (design.md
 * seccion 7: el tipo es inmutable despues del alta) — si alguien lo
 * agrega, el chequeo de propiedades excedentes de TypeScript sobre este
 * literal deja de fallar y "Unused '@ts-expect-error' directive" rompe
 * `tsc --noEmit`.
 */
const _conTipo: DatosDeEdicionDeLugar = {
  id: sectorId,
  nombre: "Sector 3-A",
  // @ts-expect-error tipo no existe en DatosDeEdicionDeLugar
  tipo: "sector",
};
void _conTipo;
