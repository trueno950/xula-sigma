import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { lugares } from "./infrastructure/esquema";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("listarLugares", () => {
  it("devuelve todos los lugares activos, anidados y raices, ordenados por nombre", async () => {
    const zeta = await crearLugar("comisaria", "Zeta raiz");
    await crearLugar("comisaria", "Alfa raiz");
    await crearLugar("colonia", "Colonia hermana", zeta);
    await crearLugar("colonia", "Colonia anidada", zeta);

    const catalogo = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeLugaresSql.listarLugares(tx),
    );

    const nombres = catalogo.map((l) => l.nombre);
    expect(nombres).toEqual([
      "Alfa raiz",
      "Colonia anidada",
      "Colonia hermana",
      "Zeta raiz",
    ]);
  });

  it("no alcanza los lugares de otro municipio: RLS acota el catalogo", async () => {
    await withTenant(ticul, (tx) =>
      tx.insert(lugares).values({
        ayuntamientoId: ticul,
        tipo: "comisaria",
        nombre: "Comisaria de Ticul",
      }),
    );

    const catalogo = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeLugaresSql.listarLugares(tx),
    );

    expect(catalogo.some((l) => l.nombre === "Comisaria de Ticul")).toBe(false);
  });
});
