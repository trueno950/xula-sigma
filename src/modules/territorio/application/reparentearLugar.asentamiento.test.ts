import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  LugarConDomiciliosError,
  type LugarId,
} from "../domain";
import type { LugarGuardado, NodoDeSubarbol } from "./puertos";
import { crearRepositorioDeLugaresFalso } from "./repositorioDeLugaresDePrueba";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: vi.fn(),
}));

const { crearReparentearLugar } = await import("./reparentearLugar");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const comisariaId = comoLugarId("11111111-1111-4111-8111-111111111111");
const otraComisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const coloniaId = comoLugarId("33333333-3333-4333-8333-333333333333");

const lugares = new Map<LugarId, LugarGuardado>([
  [
    comisariaId,
    {
      id: comisariaId,
      tipo: "comisaria",
      nombre: "a",
      padreId: null,
      bajaEn: null,
    },
  ],
  [
    otraComisariaId,
    {
      id: otraComisariaId,
      tipo: "comisaria",
      nombre: "b",
      padreId: null,
      bajaEn: null,
    },
  ],
  [
    coloniaId,
    {
      id: coloniaId,
      tipo: "colonia",
      nombre: "c",
      padreId: comisariaId,
      bajaEn: null,
    },
  ],
]);

const domicilioEnLaColonia: NodoDeSubarbol = {
  clase: "domicilio",
  id: comoDomicilioId("44444444-4444-4444-8444-444444444444"),
  lugarId: coloniaId,
  calleId: comoCalleId("55555555-5555-4555-8555-555555555555"),
  calle: "Calle 21",
  numero: "100",
};

describe("reparentearLugar entre asentamientos", () => {
  const repositorio = crearRepositorioDeLugaresFalso();

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.buscarPorId).mockImplementation(
      async (_tx, id) => lugares.get(id) ?? null,
    );
    vi.mocked(repositorio.subarbol).mockResolvedValue([domicilioEnLaColonia]);
  });

  it("bloquea la fila del lugar que mueve", async () => {
    vi.mocked(repositorio.subarbol).mockResolvedValue([]);
    const reparentearLugar = crearReparentearLugar(repositorio);

    await reparentearLugar(coloniaId, otraComisariaId, contexto);

    expect(repositorio.bloquearPorId).toHaveBeenCalledWith(
      expect.anything(),
      coloniaId,
    );
  });

  it("rechaza mover a otro asentamiento un lugar con domicilios activos", async () => {
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(coloniaId, otraComisariaId, contexto),
    ).rejects.toBeInstanceOf(LugarConDomiciliosError);

    expect(repositorio.subarbol).toHaveBeenCalledWith(
      expect.anything(),
      coloniaId,
    );
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("mueve a otro asentamiento un lugar sin domicilios", async () => {
    vi.mocked(repositorio.subarbol).mockResolvedValue([]);
    const reparentearLugar = crearReparentearLugar(repositorio);

    await reparentearLugar(coloniaId, otraComisariaId, contexto);

    expect(repositorio.actualizar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: coloniaId, padreId: otraComisariaId }),
    );
  });

  it("dentro del mismo asentamiento se mueve aunque tenga domicilios", async () => {
    const reparentearLugar = crearReparentearLugar(repositorio);

    await reparentearLugar(coloniaId, comisariaId, contexto);

    expect(repositorio.actualizar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: coloniaId, padreId: comisariaId }),
    );
  });
});
