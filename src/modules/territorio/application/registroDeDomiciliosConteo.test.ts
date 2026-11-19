import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import type {
  DomicilioDelRegistro,
  RepositorioDeRegistroDeDomicilios,
} from "./puertosDeDomicilios";
import { crearRegistroDeDomicilios } from "./registroDeDomicilios";

/**
 * El conteo de S10 en el caso de uso. Vive aparte de
 * `registroDeDomicilios.test.ts` porque ese archivo ya roza el tope de 200
 * lineas de `AGENTS.md`, y por tema: el conteo es lo unico de la lectura que
 * no alimenta una fila.
 */
type TransaccionDePrueba = Parameters<
  RepositorioDeRegistroDeDomicilios["registro"]
>[0];

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

describe("registroDeDomicilios: el conteo", () => {
  const repositorio: RepositorioDeRegistroDeDomicilios = {
    registro: vi.fn(),
    contar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repositorio.registro).mockResolvedValue([
      domicilioDePrueba("33333333-3333-4333-8333-333333333333"),
    ]);
    vi.mocked(repositorio.contar).mockResolvedValue({
      total: 9,
      coincidencias: 1,
    });
  });

  /**
   * El «de T» es el municipio entero y el «N» las coincidencias: los dos
   * numeros los devuelve la base, y el caso de uso los reenvia tal cual
   * -con los filtros ya recortados, los mismos de la consulta-.
   */
  it("pide el conteo con los filtros recortados y devuelve total y coincidencias", async () => {
    vi.mocked(repositorio.contar).mockResolvedValue({
      total: 9,
      coincidencias: 2,
    });

    const resultado = await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: { busqueda: "  Calle 20  " },
      limite: 20,
    });

    expect(repositorio.contar).toHaveBeenCalledWith(tx, {
      busqueda: "Calle 20",
    });
    expect(resultado).toMatchObject({ total: 9, coincidencias: 2 });
  });

  it("cuenta en la misma transaccion de tenant que la consulta", async () => {
    await crearRegistroDeDomicilios(repositorio)({
      tx,
      filtros: {},
      limite: 20,
    });

    expect(vi.mocked(repositorio.contar).mock.calls[0]?.[0]).toBe(
      vi.mocked(repositorio.registro).mock.calls[0]?.[0],
    );
  });

  it("no cuenta con un limite invalido: el conteo corre despues de validar", async () => {
    await expect(
      crearRegistroDeDomicilios(repositorio)({ tx, filtros: {}, limite: 0 }),
    ).rejects.toThrow(/limite invalido/);

    expect(repositorio.contar).not.toHaveBeenCalled();
  });
});
