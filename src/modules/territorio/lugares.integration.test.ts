import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeLugar } from "./application/altaDeLugar";
import { lugares } from "./infrastructure/esquema";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearDomicilio, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("subarbol", () => {
  it("un asentamiento con dos colonias y un domicilio colgado directo devuelve las tres filas", async () => {
    const comisaria = await crearLugar("comisaria", "Dzununcan");
    await crearLugar("colonia", "Colonia 1", comisaria);
    await crearLugar("colonia", "Colonia 2", comisaria);
    await crearDomicilio(comisaria, "Calle del asentamiento");

    const nodos = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, comisaria),
    );

    expect(nodos).toHaveLength(3);
    expect(nodos.filter((nodo) => nodo.clase === "lugar")).toHaveLength(2);
    expect(nodos.filter((nodo) => nodo.clase === "domicilio")).toHaveLength(1);
  });

  it("un lugar dado de baja no aparece en el subarbol de su padre", async () => {
    const comisaria = await crearLugar("comisaria", "Yaxcopoil");
    const coloniaActiva = await crearLugar(
      "colonia",
      "Colonia activa",
      comisaria,
    );
    const coloniaBaja = await crearLugar(
      "colonia",
      "Colonia de baja",
      comisaria,
    );

    await withTenant(motul, (tx) =>
      tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, coloniaBaja)),
    );

    const nodos = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, comisaria),
    );

    expect(
      nodos.some((nodo) => nodo.clase === "lugar" && nodo.id === coloniaBaja),
    ).toBe(false);
    expect(
      nodos.some((nodo) => nodo.clase === "lugar" && nodo.id === coloniaActiva),
    ).toBe(true);
  });

  it("una raiz dada de baja no devuelve sus descendientes activos", async () => {
    const comisaria = await crearLugar("comisaria", "Raiz dada de baja");
    await crearLugar("colonia", "Colonia huerfana", comisaria);

    await withTenant(motul, (tx) =>
      tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, comisaria)),
    );

    const nodos = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, comisaria),
    );

    expect(nodos).toHaveLength(0);
  });
});

describe("altaDeLugar", () => {
  it("rechaza un padre dado de baja como si no existiera", async () => {
    const comisaria = await crearLugar("comisaria", "Dzitya");

    await withTenant(motul, (tx) =>
      tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, comisaria)),
    );

    const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);

    await expect(
      altaDeLugar(
        { tipo: "colonia", nombre: "Colonia huerfana", padreId: comisaria },
        contextoDe(),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
