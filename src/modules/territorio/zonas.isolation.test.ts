import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { callesDeZonas } from "./infrastructure/esquemaDeCallesDeZonas";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { crearCalleEn, crearLugarEn } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de zonas", () => {
  it("un municipio solo ve sus zonas sin filtro explicito de tenant", async () => {
    const lugarMotul = await crearLugarEn(motul, "comisaria", "Zona Motul");
    const lugarTicul = await crearLugarEn(ticul, "comisaria", "Zona Ticul");

    const [zonaMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: motul,
          lugarId: lugarMotul,
          nombre: "Zona Motul",
        })
        .returning({ id: zonas.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(zonas).values({
        ayuntamientoId: ticul,
        lugarId: lugarTicul,
        nombre: "Zona Ticul",
      }),
    );

    const filas = await withTenant(motul, (tx) => tx.select().from(zonas));

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(zonaMotul?.id);
  });

  it("una zona acepta dos calles del mismo asentamiento", async () => {
    const lugarId = await crearLugarEn(motul, "comisaria", "Zona dos calles");
    const calleAId = await crearCalleEn(motul, lugarId, "Calle Zona A");
    const calleBId = await crearCalleEn(motul, lugarId, "Calle Zona B");

    const [zona] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({ ayuntamientoId: motul, lugarId, nombre: "Zona dos calles" })
        .returning({ id: zonas.id }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx
        .insert(callesDeZonas)
        .values([
          {
            ayuntamientoId: motul,
            zonaId: zona!.id,
            calleId: calleAId,
            lugarId,
          },
          {
            ayuntamientoId: motul,
            zonaId: zona!.id,
            calleId: calleBId,
            lugarId,
          },
        ])
        .returning({ calleId: callesDeZonas.calleId }),
    );

    expect(filas.map((fila) => fila.calleId)).toEqual(
      expect.arrayContaining([calleAId, calleBId]),
    );
  });

  it("una zona rechaza una calle de otro asentamiento", async () => {
    const lugarDeZona = await crearLugarEn(motul, "comisaria", "Zona origen");
    const otroLugar = await crearLugarEn(motul, "comisaria", "Zona ajena");
    const calleAjena = await crearCalleEn(motul, otroLugar, "Calle ajena");
    const [zona] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: motul,
          lugarId: lugarDeZona,
          nombre: "Zona origen",
        })
        .returning({ id: zonas.id }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(callesDeZonas).values({
          ayuntamientoId: motul,
          zonaId: zona!.id,
          calleId: calleAjena,
          lugarId: lugarDeZona,
        }),
      ),
    );

    expect(motivo).toMatch(/23503|foreign key/i);
  });
});
