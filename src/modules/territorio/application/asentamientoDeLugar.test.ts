import { describe, expect, it, vi } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId, type LugarId } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

const { cadenaHastaAsentamiento } = await import("./asentamientoDeLugar");

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const comisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const coloniaId = comoLugarId("33333333-3333-4333-8333-333333333333");
const coloniaHondaId = comoLugarId("44444444-4444-4444-8444-444444444444");
const coloniaMasHondaId = comoLugarId("55555555-5555-4555-8555-555555555555");

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

describe("cadenaHastaAsentamiento", () => {
  it("devuelve la cadena completa, del lugar al asentamiento", async () => {
    // Dos niveles desde el corte de `sector`/`manzana`: colonia y su
    // asentamiento. No hay escalon intermedio que la cadena pueda saltarse.
    const repositorio = repositorioCon([
      lugar({
        id: coloniaId,
        tipo: "colonia",
        nombre: "Pablo",
        padreId: cabeceraId,
      }),
      lugar({ id: cabeceraId, tipo: "cabecera", nombre: "Tepakan" }),
    ]);

    const cadena = await cadenaHastaAsentamiento(
      repositorio,
      tx,
      lugar({
        id: coloniaId,
        tipo: "colonia",
        nombre: "Pablo",
        padreId: cabeceraId,
      }),
    );

    expect(cadena.map((eslabon) => eslabon.id)).toEqual([
      coloniaId,
      cabeceraId,
    ]);
  });

  it("un lugar que ya es asentamiento devuelve un solo eslabon", async () => {
    const repositorio = repositorioCon([
      lugar({ id: comisariaId, tipo: "comisaria", nombre: "Dzununcan" }),
    ]);

    const cadena = await cadenaHastaAsentamiento(
      repositorio,
      tx,
      lugar({ id: comisariaId, tipo: "comisaria", nombre: "Dzununcan" }),
    );

    expect(cadena.map((eslabon) => eslabon.id)).toEqual([comisariaId]);
  });

  it("corta con NoEncontradoError ante un ciclo de padreId", async () => {
    const repositorio = repositorioCon([
      lugar({
        id: coloniaId,
        tipo: "colonia",
        nombre: "A",
        padreId: coloniaHondaId,
      }),
      lugar({
        id: coloniaHondaId,
        tipo: "colonia",
        nombre: "B",
        padreId: coloniaId,
      }),
    ]);

    await expect(
      cadenaHastaAsentamiento(
        repositorio,
        tx,
        lugar({
          id: coloniaId,
          tipo: "colonia",
          nombre: "A",
          padreId: coloniaHondaId,
        }),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  /**
   * El tope de saltos es `TIPOS_DE_LUGAR.length`: tres. Con un arbol de dos
   * niveles sobra, y sigue sirviendo para lo que existe —no colgar el
   * request ante datos corruptos—. Una cadena de colonias encadenadas es
   * exactamente esa corrupcion: ninguna columna de Postgres impide que una
   * colonia tenga de padre otra colonia, solo la aplicacion.
   */
  it("no sube mas escalones que tipos tiene el catalogo", async () => {
    const enlaces = [
      [coloniaId, coloniaHondaId],
      [coloniaHondaId, coloniaMasHondaId],
      [coloniaMasHondaId, comisariaId],
    ] as const;
    const colonias = enlaces.map(([id, padreId], indice) =>
      lugar({ id, tipo: "colonia", nombre: `Colonia ${indice}`, padreId }),
    );
    const repositorio = repositorioCon([
      ...colonias,
      lugar({ id: comisariaId, tipo: "comisaria", nombre: "Dzununcan" }),
    ]);

    await expect(
      cadenaHastaAsentamiento(
        repositorio,
        tx,
        lugar({
          id: coloniaId,
          tipo: "colonia",
          nombre: "A",
          padreId: coloniaHondaId,
        }),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("corta con NoEncontradoError cuando un padre es inalcanzable", async () => {
    const repositorio = repositorioCon([
      lugar({
        id: coloniaId,
        tipo: "colonia",
        nombre: "A",
        padreId: coloniaHondaId,
      }),
    ]);

    await expect(
      cadenaHastaAsentamiento(
        repositorio,
        tx,
        lugar({
          id: coloniaId,
          tipo: "colonia",
          nombre: "A",
          padreId: coloniaHondaId,
        }),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
