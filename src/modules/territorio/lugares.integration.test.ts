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
import { comoLugarId } from "./domain";
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
  it("un sector con dos manzanas y un domicilio colgado directo del sector devuelve las tres filas", async () => {
    const comisaria = await crearLugar("comisaria", "Dzununcan");
    const sector = await crearLugar("sector", "Sector 3", comisaria);
    await crearLugar("manzana", "Manzana 1", sector);
    await crearLugar("manzana", "Manzana 2", sector);
    await crearDomicilio(sector, "Calle del sector");

    const nodos = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, sector),
    );

    expect(nodos).toHaveLength(3);
    expect(nodos.filter((nodo) => nodo.clase === "lugar")).toHaveLength(2);
    expect(nodos.filter((nodo) => nodo.clase === "domicilio")).toHaveLength(1);
  });

  it("un lugar dado de baja no aparece en el subarbol de su padre", async () => {
    const comisaria = await crearLugar("comisaria", "Yaxcopoil");
    const sector = await crearLugar("sector", "Sector con baja", comisaria);
    const manzanaActiva = await crearLugar("manzana", "Manzana activa", sector);
    const manzanaBaja = await crearLugar("manzana", "Manzana de baja", sector);

    await withTenant(motul, (tx) =>
      tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, manzanaBaja)),
    );

    const nodos = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, sector),
    );

    expect(
      nodos.some((nodo) => nodo.clase === "lugar" && nodo.id === manzanaBaja),
    ).toBe(false);
    expect(
      nodos.some((nodo) => nodo.clase === "lugar" && nodo.id === manzanaActiva),
    ).toBe(true);
  });

  it("una raiz dada de baja no devuelve sus descendientes activos", async () => {
    const comisaria = await crearLugar("comisaria", "Raiz dada de baja");
    await crearLugar("sector", "Sector huerfano", comisaria);

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
    const [sector] = await withTenant(motul, async (tx) => {
      const [fila] = await tx
        .insert(lugares)
        .values({
          ayuntamientoId: motul,
          tipo: "sector",
          nombre: "Sector cerrado",
          padreId: comisaria,
        })
        .returning({ id: lugares.id });
      await tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, fila!.id));
      return [comoLugarId(fila!.id)];
    });

    const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);

    await expect(
      altaDeLugar(
        { tipo: "manzana", nombre: "Manzana huerfana", padreId: sector! },
        contextoDe(),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
