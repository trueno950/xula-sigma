import { describe, expect, it, vi } from "vitest";
import { comoLugarId, type LugarId } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

const { asentamientoContenedorDe } = await import("./asentamientoDeLugar");

const comisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const coloniaId = comoLugarId("33333333-3333-4333-8333-333333333333");

const lugar = ({
  id,
  tipo,
  nombre,
  padreId = null,
}: {
  id: LugarId;
  tipo: LugarGuardado["tipo"];
  nombre: string;
  padreId?: LugarGuardado["padreId"];
}): LugarGuardado => ({ id, tipo, nombre, padreId, bajaEn: null });

const repositorioCon = (
  lugares: readonly LugarGuardado[],
): RepositorioDeLugares => ({
  crear: vi.fn(),
  buscarPorId: vi.fn(
    async (_tx, id) => lugares.find((l) => l.id === id) ?? null,
  ),
  actualizar: vi.fn(),
  contarHijosActivos: vi.fn(),
  contarDomiciliosColgados: vi.fn(),
  subarbol: vi.fn(),
  listarRaices: vi.fn(),
  listarLugares: vi.fn(),
  existeCabecera: vi.fn(),
});

const tx = {} as Parameters<RepositorioDeLugares["buscarPorId"]>[0];

describe("asentamientoContenedorDe", () => {
  it("devuelve el ultimo eslabon de la cadena", async () => {
    const repositorio = repositorioCon([
      lugar({
        id: coloniaId,
        tipo: "colonia",
        nombre: "Pablo",
        padreId: comisariaId,
      }),
      lugar({ id: comisariaId, tipo: "comisaria", nombre: "Dzununcan" }),
    ]);

    const asentamiento = await asentamientoContenedorDe(
      repositorio,
      tx,
      lugar({
        id: coloniaId,
        tipo: "colonia",
        nombre: "Pablo",
        padreId: comisariaId,
      }),
    );

    expect(asentamiento.id).toBe(comisariaId);
  });
});
