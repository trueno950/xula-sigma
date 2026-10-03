import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoLugarId } from "../domain";
import type { LectorDeContenidoDeLugares } from "./puertosDeContenidoDeLugares";

/** Por que no hay guarda de rol aca: `contarContenidoDeLugares.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearContarContenidoDeLugares } = await import(
  "./contarContenidoDeLugares"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const CABECERA = comoLugarId("11111111-1111-4111-8111-111111111111");
const COLONIA = comoLugarId("22222222-2222-4222-8222-222222222222");

describe("contarContenidoDeLugares", () => {
  const lector: LectorDeContenidoDeLugares = { contarPorLugar: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y lee todo con una sola consulta, sin exigir rol", async () => {
    vi.mocked(lector.contarPorLugar).mockResolvedValue([]);

    await crearContarContenidoDeLugares(lector)(contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(lector.contarPorLugar).toHaveBeenCalledTimes(1);
  });

  it("devuelve las calles solo de los lugares que tienen catalogo", async () => {
    vi.mocked(lector.contarPorLugar).mockResolvedValue([
      { lugarId: CABECERA, tipo: "cabecera", domicilios: 12, calles: 6 },
      { lugarId: COLONIA, tipo: "colonia", domicilios: 3, calles: 2 },
    ]);

    const resultado = await crearContarContenidoDeLugares(lector)(contexto);

    expect(resultado).toEqual([
      { lugarId: CABECERA, domicilios: 12, calles: 6 },
      { lugarId: COLONIA, domicilios: 3, calles: null },
    ]);
  });
});
