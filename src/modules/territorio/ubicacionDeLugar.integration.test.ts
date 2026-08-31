import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaLugar } from "./application/darDeBajaLugar";
import { crearReparentearLugar } from "./application/reparentearLugar";
import { crearUbicacionDeLugar } from "./application/ubicacionDeLugar";
import { comoCalleId, comoLugarId } from "./domain";
import { calles, lugares } from "./infrastructure/esquema";
import { lectorDeUbicacionesSql } from "./infrastructure/lectorDeUbicacionesSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const ubicacionDeLugar = crearUbicacionDeLugar(lectorDeUbicacionesSql);
const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);
const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);

describe("ubicacionDeLugar", () => {
  it("un lugarId de otro municipio se ve como si no existiera: RLS lo esconde", async () => {
    const [lugarDeTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(lugares)
        .values({ ayuntamientoId: ticul, tipo: "comisaria", nombre: "Peto" })
        .returning({ id: lugares.id }),
    );

    const resultado = await ubicacionDeLugar(
      { lugarId: comoLugarId(lugarDeTicul!.id), calleId: null },
      contextoDe(),
    );

    expect(resultado).toBeNull();
  });

  it("una calleId de otro municipio devuelve null entero, distinto del caso sin calle (verifica el punto 1.4)", async () => {
    const colonia = await crearLugar("colonia", "Colonia para calleId ajeno");
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
          nombre: "Calle ajena",
          lugarId: lugarDeTicul!.id,
        })
        .returning({ id: calles.id }),
    );

    const sinCalle = await ubicacionDeLugar(
      { lugarId: colonia, calleId: null },
      contextoDe(),
    );
    const conCalleAjena = await ubicacionDeLugar(
      { lugarId: colonia, calleId: comoCalleId(calleDeTicul!.id) },
      contextoDe(),
    );

    expect(sinCalle).not.toBeNull();
    expect(conCalleAjena).toBeNull();
  });

  it("un lugar dado de baja se ve como si no existiera", async () => {
    const comisaria = await crearLugar("comisaria", "Con baja");
    const sector = await crearLugar(
      "sector",
      "Sector para dar de baja",
      comisaria,
    );
    await darDeBajaLugar(sector, contextoDe());

    const resultado = await ubicacionDeLugar(
      { lugarId: sector, calleId: null },
      contextoDe(),
    );

    expect(resultado).toBeNull();
  });

  it("reparentear la colonia del lugar cambia el texto -comportamiento vivo, no una copia congelada-", async () => {
    const comisariaOrigen = await crearLugar("comisaria", "Origen Ubicacion");
    const comisariaDestino = await crearLugar("comisaria", "Destino Ubicacion");
    const colonia = await crearLugar(
      "colonia",
      "Colonia Movil Ubicacion",
      comisariaOrigen,
    );
    const calle = await crearCalle(colonia, "Calle Movil Ubicacion");

    const antes = await ubicacionDeLugar(
      { lugarId: colonia, calleId: calle },
      contextoDe(),
    );
    expect(antes?.texto).toContain("Origen Ubicacion");

    await reparentearLugar(colonia, comisariaDestino, contextoDe());

    const despues = await ubicacionDeLugar(
      { lugarId: colonia, calleId: calle },
      contextoDe(),
    );
    expect(despues?.texto).toContain("Destino Ubicacion");
    expect(despues?.texto).not.toContain("Origen Ubicacion");
  });
});
