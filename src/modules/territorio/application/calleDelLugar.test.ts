import { describe, expect, it } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { comoCalleId, comoLugarId, type LugarId } from "../domain";
import { crearCalleDelLugar } from "./calleDelLugar";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";

/**
 * Puertos fabricados a mano, mismo patron que `lectorDeUbicacionesSql.test.ts`:
 * el caso de uso solo pide `buscarPorId`, y `asentamientoContenedorDe` -que si
 * recibe el puerto completo de lugares- termina usando el mismo. De ahi el
 * casteo.
 */
const tx = {} as TransaccionTenant;

const ASENTAMIENTO = comoLugarId("11111111-1111-4111-8111-111111111111");
const COLONIA = comoLugarId("22222222-2222-4222-8222-222222222222");
const OTRO_ASENTAMIENTO = comoLugarId("33333333-3333-4333-8333-333333333333");
const INEXISTENTE = comoLugarId("55555555-5555-4555-8555-555555555555");
const CALLE = comoCalleId("44444444-4444-4444-8444-444444444444");

const unLugar = (
  id: LugarId,
  tipo: LugarGuardado["tipo"],
  padreId: LugarId | null,
): LugarGuardado => ({
  id,
  tipo,
  padreId,
  nombre: `Lugar ${tipo}`,
  bajaEn: null,
});

const unaCalle = (
  lugarId: LugarId,
  bajaEn: Date | null = null,
): CalleGuardada => ({
  id: CALLE,
  nombre: "Calle 20",
  lugarId,
  punto: null,
  bajaEn,
});

const arbol: readonly LugarGuardado[] = [
  unLugar(ASENTAMIENTO, "comisaria", null),
  unLugar(COLONIA, "colonia", ASENTAMIENTO),
  unLugar(OTRO_ASENTAMIENTO, "comisaria", null),
];

const leerCon = (
  lugares: readonly LugarGuardado[],
  calleGuardada: CalleGuardada | null,
) => {
  const repositorioDeLugares = {
    buscarPorId: async (_tx: unknown, id: string) =>
      lugares.find((candidato) => candidato.id === id) ?? null,
  } as unknown as RepositorioDeLugares;
  const repositorioDeCalles = {
    buscarPorId: async () => calleGuardada,
  } as unknown as RepositorioDeCalles;

  return crearCalleDelLugar({ repositorioDeLugares, repositorioDeCalles });
};

describe("calleDelLugar", () => {
  /**
   * S6 de `intervenciones-ux`: la calle de una colonia es la del asentamiento
   * que la contiene, no la de la colonia misma.
   */
  it("la calle del asentamiento que contiene a la colonia es del lugar", async () => {
    await expect(
      leerCon(arbol, unaCalle(ASENTAMIENTO))(tx, {
        lugarId: COLONIA,
        calleId: CALLE,
      }),
    ).resolves.toBe("del-lugar");
  });

  it("la calle de otro asentamiento no es del lugar", async () => {
    await expect(
      leerCon(arbol, unaCalle(OTRO_ASENTAMIENTO))(tx, {
        lugarId: COLONIA,
        calleId: CALLE,
      }),
    ).resolves.toBe("fuera-del-lugar");
  });

  it("una calle de baja no resuelve", async () => {
    await expect(
      leerCon(arbol, unaCalle(ASENTAMIENTO, new Date()))(tx, {
        lugarId: COLONIA,
        calleId: CALLE,
      }),
    ).resolves.toBe("no-resuelve");
  });

  it("una calle inexistente o de otro municipio no resuelve", async () => {
    await expect(
      leerCon(arbol, null)(tx, { lugarId: COLONIA, calleId: CALLE }),
    ).resolves.toBe("no-resuelve");
  });

  it("un lugar inexistente no resuelve", async () => {
    await expect(
      leerCon(arbol, unaCalle(ASENTAMIENTO))(tx, {
        lugarId: INEXISTENTE,
        calleId: CALLE,
      }),
    ).resolves.toBe("no-resuelve");
  });

  /**
   * Una colonia sin padre es un dato corrupto -`cadenaHastaAsentamiento`
   * lanza-, y esta lectura responde un veredicto, nunca una excepcion: el
   * consumidor ya sabe que hacer con "no resuelve".
   */
  it("un lugar sin asentamiento en su cadena no resuelve", async () => {
    await expect(
      leerCon([unLugar(COLONIA, "colonia", null)], unaCalle(ASENTAMIENTO))(tx, {
        lugarId: COLONIA,
        calleId: CALLE,
      }),
    ).resolves.toBe("no-resuelve");
  });
});
