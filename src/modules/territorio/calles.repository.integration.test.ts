import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { comoCalleId } from "./domain";
import { calles, domicilios } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("comportamiento del repositorio de calles", () => {
  it("crea y relee una calle sin punto", async () => {
    const lugarId = await crearLugar(
      "comisaria",
      "Alta sin punto en repositorio",
    );
    const id = comoCalleId(randomUUID());

    await withTenant(motul, (tx) =>
      repositorioDeCallesSql.crear(tx, {
        id,
        ayuntamientoId: motul,
        nombre: "Calle sin punto en repositorio",
        lugarId,
      }),
    );

    await expect(
      withTenant(motul, (tx) => repositorioDeCallesSql.buscarPorId(tx, id)),
    ).resolves.toMatchObject({ id, lugarId, punto: null, bajaEn: null });
  });

  it("traduce el nombre duplicado cuando la actualizacion cambia de lugar", async () => {
    const lugarOrigen = await crearLugar("comisaria", "Origen duplicado");
    const lugarDestino = await crearLugar("comisaria", "Destino duplicado");
    const [existente, aMover] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values([
          { ayuntamientoId: motul, nombre: "Calle 21", lugarId: lugarDestino },
          { ayuntamientoId: motul, nombre: "Calle 21", lugarId: lugarOrigen },
        ])
        .returning({ id: calles.id }),
    );
    if (!existente || !aMover) throw new Error("Las calles no fueron creadas.");

    await expect(
      withTenant(motul, (tx) =>
        repositorioDeCallesSql.actualizar(tx, {
          id: comoCalleId(aMover.id),
          nombre: "Calle 21",
          lugarId: lugarDestino,
          punto: null,
          bajaEn: null,
        }),
      ),
    ).rejects.toThrow("Ya existe una calle con ese nombre");
    expect(existente.id).not.toBe(aMover.id);
  });

  it("cuenta domicilios que usan una calle como principal o transversal", async () => {
    const lugarId = await crearLugar("comisaria", "Domicilios calle");
    const [callePrincipal, calleA, calleB, calleNoUsada] = await withTenant(
      motul,
      (tx) =>
        tx
          .insert(calles)
          .values([
            { ayuntamientoId: motul, nombre: "Principal", lugarId },
            { ayuntamientoId: motul, nombre: "Transversal A", lugarId },
            { ayuntamientoId: motul, nombre: "Transversal B", lugarId },
            { ayuntamientoId: motul, nombre: "No usada", lugarId },
          ])
          .returning({ id: calles.id }),
    );
    if (!callePrincipal || !calleA || !calleB || !calleNoUsada) {
      throw new Error("Las calles no fueron creadas.");
    }
    await withTenant(motul, (tx) =>
      tx.insert(domicilios).values({
        ayuntamientoId: motul,
        lugarId,
        calleId: callePrincipal.id,
        entreCalleAId: calleA.id,
        entreCalleBId: calleB.id,
      }),
    );
    await withTenant(motul, (tx) =>
      tx.insert(domicilios).values({
        ayuntamientoId: motul,
        lugarId,
        calleId: calleNoUsada.id,
      }),
    );

    const cuenta = (id: string) =>
      withTenant(motul, (tx) =>
        repositorioDeCallesSql.contarDomiciliosQueLaUsan(tx, comoCalleId(id)),
      );

    await expect(cuenta(callePrincipal.id)).resolves.toBe(1);
    await expect(cuenta(calleA.id)).resolves.toBe(1);
    await expect(cuenta(calleB.id)).resolves.toBe(1);
    await expect(cuenta(calleNoUsada.id)).resolves.toBe(1);
  });

  it("conserva exactamente el punto al cambiar de lugar", async () => {
    const lugarOrigen = await crearLugar("comisaria", "Origen con punto");
    const lugarDestino = await crearLugar("comisaria", "Destino con punto");
    const punto = { latitud: 19.4333, longitud: -87.4833 };
    const [calle] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: motul,
          nombre: "Calle con punto preservado",
          lugarId: lugarOrigen,
          latitud: punto.latitud,
          longitud: punto.longitud,
        })
        .returning({ id: calles.id }),
    );
    if (!calle) throw new Error("La calle de prueba no fue creada.");

    const actualizada = await withTenant(motul, (tx) =>
      repositorioDeCallesSql.actualizar(tx, {
        id: comoCalleId(calle.id),
        nombre: "Calle con punto preservado",
        lugarId: lugarDestino,
        punto,
        bajaEn: null,
      }),
    );

    expect(actualizada).toMatchObject({ lugarId: lugarDestino, punto });
  });

  it("permite limpiar el punto con una actualizacion nullable", async () => {
    const lugarId = await crearLugar("comisaria", "Limpiar punto");
    const [calle] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: motul,
          nombre: "Calle con punto",
          lugarId,
          latitud: 20.937,
          longitud: -89.6237,
        })
        .returning({ id: calles.id }),
    );
    if (!calle) throw new Error("La calle no fue creada.");

    const actualizada = await withTenant(motul, (tx) =>
      repositorioDeCallesSql.actualizar(tx, {
        id: comoCalleId(calle.id),
        nombre: "Calle con punto",
        lugarId,
        punto: null,
        bajaEn: null,
      }),
    );

    expect(actualizada?.punto).toBeNull();
  });
});
