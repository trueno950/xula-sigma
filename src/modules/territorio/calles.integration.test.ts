import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaCalle } from "./application/darDeBajaCalle";
import { crearReparentearCalle } from "./application/reparentearCalle";
import {
  CalleConDomiciliosError,
  type CalleId,
  comoCalleId,
  type DomicilioId,
  type LugarId,
} from "./domain";
import { calles } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const reparentearCalle = crearReparentearCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);
const darDeBajaCalle = crearDarDeBajaCalle(repositorioDeCallesSql);

const leerCalle = (id: CalleId) =>
  withTenant(motul, (tx) => repositorioDeCallesSql.buscarPorId(tx, id));
const leerDomicilio = (id: DomicilioId) =>
  withTenant(motul, (tx) => repositorioDeDomiciliosSql.buscarPorId(tx, id));

const crearCalleDadaDeBaja = async (lugarId: LugarId): Promise<CalleId> => {
  const [calle] = await withTenant(motul, (tx) =>
    tx
      .insert(calles)
      .values({ ayuntamientoId: motul, nombre: "Calle baja", lugarId })
      .returning({ id: calles.id }),
  );
  if (!calle) throw new Error("La calle de prueba no fue creada.");

  const calleId = comoCalleId(calle.id);
  await withTenant(motul, (tx) =>
    tx.update(calles).set({ bajaEn: new Date() }).where(eq(calles.id, calleId)),
  );
  return calleId;
};
const verificarCalleDadaDeBaja = async (
  calleId: CalleId,
  lugarId: LugarId,
): Promise<void> => {
  await expect(
    withTenant(motul, (tx) =>
      repositorioDeCallesSql.actualizar(tx, {
        id: calleId,
        nombre: "Calle baja editada",
        lugarId,
        punto: null,
        bajaEn: null,
      }),
    ),
  ).resolves.toBeNull();
  await expect(
    withTenant(motul, (tx) => repositorioDeCallesSql.buscarPorId(tx, calleId)),
  ).resolves.toBeNull();
  await expect(
    withTenant(motul, (tx) =>
      repositorioDeCallesSql.listarPorLugar(tx, lugarId),
    ),
  ).resolves.toEqual([]);
};
describe("persistencia de coordenadas y estado de calles", () => {
  it("guarda una calle nueva sin punto con ambas columnas NULL", async () => {
    const lugarId = await crearLugar("comisaria", "Calle sin punto");
    const [calle] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values({ ayuntamientoId: motul, nombre: "Calle vacia", lugarId })
        .returning({ latitud: calles.latitud, longitud: calles.longitud }),
    );

    expect(calle).toEqual({ latitud: null, longitud: null });
  });

  it("rechaza una coordenada parcial en Postgres", async () => {
    const lugarId = await crearLugar("comisaria", "CHECK parcial");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(calles).values({
          ayuntamientoId: motul,
          nombre: "Calle parcial",
          lugarId,
          latitud: 20.5,
        }),
      ),
    );

    expect(motivo).toMatch(/calles_punto_completo/i);
  });

  it("actualiza las cuatro columnas mutables y las vuelve a leer", async () => {
    const lugarId = await crearLugar("comisaria", "Round trip");
    const [calle] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values({ ayuntamientoId: motul, nombre: "Calle round", lugarId })
        .returning({ id: calles.id }),
    );
    if (!calle) throw new Error("La calle de prueba no fue creada.");
    const calleId = comoCalleId(calle.id);
    const punto = { latitud: 20.937, longitud: -89.6237 };

    const actualizada = await withTenant(motul, (tx) =>
      repositorioDeCallesSql.actualizar(tx, {
        id: calleId,
        nombre: "Calle round actualizada",
        lugarId,
        punto,
        bajaEn: null,
      }),
    );

    expect(actualizada).toMatchObject({
      id: calleId,
      nombre: "Calle round actualizada",
      lugarId,
      punto,
      bajaEn: null,
    });
  });

  /** Antes movia la calle y dejaba domicilio.lugarId apuntando al origen. */
  it("rechaza mover una calle a otro asentamiento si tiene domicilios colgados", async () => {
    const lugarOrigen = await crearLugar("comisaria", "Origen con domicilio");
    const lugarDestino = await crearLugar("comisaria", "Destino con domicilio");
    const calleId = await crearCalle(lugarOrigen, "Calle con domicilio");
    const domicilioId = await crearDomicilioEnCalle(lugarOrigen, calleId);

    await expect(
      reparentearCalle(calleId, lugarDestino, contextoDe()),
    ).rejects.toBeInstanceOf(CalleConDomiciliosError);

    const calleDespues = await leerCalle(calleId);
    const domicilioDespues = await leerDomicilio(domicilioId);

    expect(calleDespues?.lugarId).toBe(lugarOrigen);
    expect(domicilioDespues?.lugarId).toBe(lugarOrigen);
  });

  it("reparenta al destino si su calle con el mismo nombre esta dada de baja", async () => {
    const lugarOrigen = await crearLugar("comisaria", "Origen nombre liberado");
    const lugarDestino = await crearLugar(
      "comisaria",
      "Destino nombre liberado",
    );
    const nombre = "Calle 21";
    const calleDadaDeBaja = await crearCalle(lugarDestino, nombre);
    await darDeBajaCalle(calleDadaDeBaja, contextoDe());
    const calleActiva = await crearCalle(lugarOrigen, nombre);

    await expect(
      reparentearCalle(calleActiva, lugarDestino, contextoDe()),
    ).resolves.toBeUndefined();
    await expect(leerCalle(calleActiva)).resolves.toMatchObject({
      lugarId: lugarDestino,
      bajaEn: null,
    });
  });

  it("una calle dada de baja no aparece ni se puede actualizar", async () => {
    const lugarId = await crearLugar("comisaria", "Guarda activa");
    const calleId = await crearCalleDadaDeBaja(lugarId);

    await verificarCalleDadaDeBaja(calleId, lugarId);
  });
});
