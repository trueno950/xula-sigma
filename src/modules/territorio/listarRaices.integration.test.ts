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

describe("listarRaices", () => {
  it("devuelve solo los lugares de nivel superior activos, ordenados por nombre", async () => {
    await crearLugar("comisaria", "Zeta raiz");
    await crearLugar("comisaria", "Alfa raiz");
    const colonia = await crearLugar("colonia", "Colonia con hijos");
    await crearLugar("manzana", "Manzana anidada", colonia);

    const raices = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeLugaresSql.listarRaices(tx),
    );

    const nombres = raices.map((l) => l.nombre);
    expect(nombres).toContain("Alfa raiz");
    expect(nombres).toContain("Zeta raiz");
    expect(nombres).not.toContain("Manzana anidada");
    expect(nombres.indexOf("Alfa raiz")).toBeLessThan(
      nombres.indexOf("Zeta raiz"),
    );
  });

  it("no alcanza las raices de otro municipio: RLS acota el listado", async () => {
    await withTenant(ticul, (tx) =>
      tx.insert(lugares).values({
        ayuntamientoId: ticul,
        tipo: "comisaria",
        nombre: "Raiz de Ticul",
      }),
    );

    const raices = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeLugaresSql.listarRaices(tx),
    );

    expect(raices.some((l) => l.nombre === "Raiz de Ticul")).toBe(false);
  });
});
