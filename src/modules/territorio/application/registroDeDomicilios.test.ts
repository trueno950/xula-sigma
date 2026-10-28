import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type LugarId,
} from "../domain";
import type {
  DomicilioDelRegistro,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";
import { crearRegistroDeDomicilios } from "./registroDeDomicilios";

type TransaccionDePrueba = Parameters<RepositorioDeDomicilios["registro"]>[0];

const tx = {} as TransaccionDePrueba;

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");

const domicilioDePrueba = (id: string): DomicilioDelRegistro => ({
  id: comoDomicilioId(id),
  calle: "Calle 20",
  calleId: comoCalleId("22222222-2222-4222-8222-222222222222"),
  numero: "5",
  lugar: "Centro",
  lugarId: raizId,
  raizId,
});

describe("registroDeDomicilios", () => {
  const repositorio: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    listar: vi.fn(),
    registro: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositorio.registro).mockResolvedValue([
      domicilioDePrueba("33333333-3333-4333-8333-333333333333"),
    ]);
  });

  it("reenvia solo el filtro de asentamiento y pide una fila adicional", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { raizId },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: { raizId },
    });
  });

  it("valida raizId antes de delegar al repositorio", async () => {
    await expect(
      crearRegistroDeDomicilios(repositorio)({
        tx,
        filtros: { raizId: "raiz-invalida" as LugarId },
        limite: 20,
      }),
    ).rejects.toThrow("LugarId invalido");

    expect(repositorio.registro).not.toHaveBeenCalled();
  });

  it("reenvia solo el filtro de calle", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { calle: "Calle 20" },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: { calle: "Calle 20" },
    });
  });

  it("recorta la busqueda por texto antes de reenviarla", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { busqueda: "  Calle 20  " },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: { busqueda: "Calle 20" },
    });
  });

  it("combina la busqueda por texto con los filtros previos", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { raizId, calle: "Calle 20", numero: "5", busqueda: "Centro" },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: { raizId, calle: "Calle 20", numero: "5", busqueda: "Centro" },
    });
  });

  it("recorta el numero antes de reenviarlo como igualdad exacta", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { numero: " 5 " },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: { numero: "5" },
    });
  });

  it("descarta un numero de solo espacios en vez de reenviarlo vacio", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { numero: "   " },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: {},
    });
  });

  it("descarta una calle de solo espacios en vez de reenviarla vacia", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { calle: "   " },
      limite: 20,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 21,
      filtros: {},
    });
  });

  it("combina los tres filtros y recorta la fila adicional", async () => {
    const domicilios = [
      domicilioDePrueba("33333333-3333-4333-8333-333333333333"),
      domicilioDePrueba("44444444-4444-4444-8444-444444444444"),
    ];
    vi.mocked(repositorio.registro).mockResolvedValue(domicilios);

    const resultado = await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { raizId, calle: "Calle 20", numero: " 5 " },
      limite: 1,
    });

    expect(repositorio.registro).toHaveBeenCalledWith(tx, {
      limite: 2,
      filtros: { raizId, calle: "Calle 20", numero: "5" },
    });
    expect(resultado).toEqual({
      domicilios: domicilios.slice(0, 1),
      hayMas: true,
    });
  });

  it.each([0, -1, 1.5])(
    "rechaza un limite invalido sin ir al repositorio: %s",
    async (limite) => {
      await expect(
        crearRegistroDeDomicilios(repositorio)({ tx, filtros: {}, limite }),
      ).rejects.toThrow(/limite invalido/);

      expect(repositorio.registro).not.toHaveBeenCalled();
    },
  );
});
