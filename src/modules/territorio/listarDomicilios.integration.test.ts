import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { calles, domicilios, lugares } from "./infrastructure/esquema";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
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

describe("listarDomicilios", () => {
  it("lista los domicilios del municipio con calle y lugar, ordenados por lugar", async () => {
    const alfa = await crearLugar("colonia", "Colonia Alfa");
    const beta = await crearLugar("comisaria", "Comisaria Beta");
    const calleDeAlfa = await crearCalle(alfa, "Calle 20");
    const calleDeBeta = await crearCalle(beta, "Calle 5");
    await crearDomicilioEnCalle(alfa, calleDeAlfa);
    await crearDomicilioEnCalle(beta, calleDeBeta);

    const filas = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.listar(tx),
    );

    const filaDeAlfa = filas.find((f) => f.lugar === "Colonia Alfa");
    const indiceAlfa = filas.findIndex((f) => f.lugar === "Colonia Alfa");
    const indiceBeta = filas.findIndex((f) => f.lugar === "Comisaria Beta");

    expect(filaDeAlfa).toMatchObject({ calle: "Calle 20" });
    expect(indiceAlfa).toBeGreaterThanOrEqual(0);
    expect(indiceBeta).toBeGreaterThan(indiceAlfa);
  });

  it("no alcanza los domicilios de otro municipio: RLS acota el listado", async () => {
    const [lugarDeTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(lugares)
        .values({
          ayuntamientoId: ticul,
          tipo: "colonia",
          nombre: "Colonia de Ticul",
        })
        .returning({ id: lugares.id }),
    );
    const [calleDeTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: ticul,
          nombre: "Calle de Ticul",
          lugarId: lugarDeTicul!.id,
        })
        .returning({ id: calles.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(domicilios).values({
        ayuntamientoId: ticul,
        lugarId: lugarDeTicul!.id,
        calleId: calleDeTicul!.id,
        numero: "1",
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
      }),
    );

    const filas = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.listar(tx),
    );

    expect(filas.some((f) => f.calle === "Calle de Ticul")).toBe(false);
  });
});
