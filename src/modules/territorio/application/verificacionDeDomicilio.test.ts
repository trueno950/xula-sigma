import { describe, expect, it, vi } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  comoCalleId,
  comoLugarId,
  type LugarId,
  ZonaIncoherenteError,
} from "../domain";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";
import { verificarZonaYCalles } from "./verificacionDeDomicilio";

type Transaccion = Parameters<RepositorioDeCalles["bloquearPorId"]>[0];

const asentamientoId = comoLugarId("11111111-1111-4111-8111-111111111111");
const otroAsentamientoId = comoLugarId("22222222-2222-4222-8222-222222222222");
const coloniaId = comoLugarId("33333333-3333-4333-8333-333333333333");
const otraColoniaId = comoLugarId("44444444-4444-4444-8444-444444444444");
const calleId = comoCalleId("55555555-5555-4555-8555-555555555555");

const lugar = (
  id: LugarId,
  tipo: LugarGuardado["tipo"],
  padreId: LugarId | null,
): LugarGuardado => ({
  id,
  tipo,
  nombre: id === coloniaId ? "Pablo" : "Tepakan",
  padreId,
  bajaEn: null,
});

const calle: CalleGuardada = {
  id: calleId,
  nombre: "Calle 21",
  lugarId: asentamientoId,
  punto: null,
  bajaEn: null,
};

const crearDependencias = () => {
  const lugares = new Map<LugarId, LugarGuardado>([
    [asentamientoId, lugar(asentamientoId, "cabecera", null)],
    [coloniaId, lugar(coloniaId, "colonia", asentamientoId)],
    [otroAsentamientoId, lugar(otroAsentamientoId, "cabecera", null)],
    [otraColoniaId, lugar(otraColoniaId, "colonia", otroAsentamientoId)],
  ]);
  const repositorioDeCalles: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn().mockResolvedValue(calle),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    contarZonasQueLaUsan: vi.fn().mockResolvedValue(0),
    listarPorLugar: vi.fn(),
    registrarEventoDeAlta: vi.fn(),
    registrarEventoDeRenombre: vi.fn(),
    registrarEventoDeReparenteo: vi.fn(),
    registrarEventoDeUbicacion: vi.fn(),
  };
  const repositorioDeLugares: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi
      .fn()
      .mockImplementation(async (_tx, id) => lugares.get(id) ?? null),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
    existeCabecera: vi.fn(),
  };

  return { repositorioDeCalles, repositorioDeLugares };
};

describe("verificarZonaYCalles", () => {
  const tx = {} as Transaccion;

  it("deriva el asentamiento de la calle principal sin lugarId", async () => {
    const { repositorioDeCalles, repositorioDeLugares } = crearDependencias();

    await expect(
      verificarZonaYCalles({ repositorioDeCalles, repositorioDeLugares }, tx, {
        calleId,
        entreCalleAId: null,
        entreCalleBId: null,
      }),
    ).resolves.toBe(asentamientoId);
  });

  it("rechaza un lugarId de otra cadena como ubicacion incoherente", async () => {
    const { repositorioDeCalles, repositorioDeLugares } = crearDependencias();

    await expect(
      verificarZonaYCalles({ repositorioDeCalles, repositorioDeLugares }, tx, {
        lugarId: otraColoniaId,
        nivelesDeclarados: [otraColoniaId],
        calleId,
        entreCalleAId: null,
        entreCalleBId: null,
      }),
    ).rejects.toBeInstanceOf(ZonaIncoherenteError);
  });

  it("permite colgar la direccion de una colonia de la cadena de la calle", async () => {
    const { repositorioDeCalles, repositorioDeLugares } = crearDependencias();

    await expect(
      verificarZonaYCalles({ repositorioDeCalles, repositorioDeLugares }, tx, {
        lugarId: coloniaId,
        nivelesDeclarados: [coloniaId],
        calleId,
        entreCalleAId: null,
        entreCalleBId: null,
      }),
    ).resolves.toBe(coloniaId);
  });

  it("rechaza una calle principal inexistente", async () => {
    const { repositorioDeCalles, repositorioDeLugares } = crearDependencias();
    vi.mocked(repositorioDeCalles.bloquearPorId).mockResolvedValue(null);

    await expect(
      verificarZonaYCalles({ repositorioDeCalles, repositorioDeLugares }, tx, {
        calleId,
        entreCalleAId: null,
        entreCalleBId: null,
      }),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
