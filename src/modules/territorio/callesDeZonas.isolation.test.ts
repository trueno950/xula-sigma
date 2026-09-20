import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appSinTenant,
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { calles } from "./infrastructure/esquemaDeCalles";
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

describe("aislamiento de calles de zonas", () => {
  it("un municipio solo ve la pertenencia de sus zonas", async () => {
    const lugarMotul = await crearLugarEn(
      motul,
      "comisaria",
      "Pertenencia Motul",
    );
    const lugarTicul = await crearLugarEn(
      ticul,
      "comisaria",
      "Pertenencia Ticul",
    );
    const calleMotul = await crearCalleEn(
      motul,
      lugarMotul,
      "Calle pertenencia M",
    );
    const calleTicul = await crearCalleEn(
      ticul,
      lugarTicul,
      "Calle pertenencia T",
    );

    const [zonaMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: motul,
          lugarId: lugarMotul,
          nombre: "Zona M",
        })
        .returning({ id: zonas.id }),
    );
    const [zonaTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: ticul,
          lugarId: lugarTicul,
          nombre: "Zona T",
        })
        .returning({ id: zonas.id }),
    );
    await withTenant(motul, (tx) =>
      tx.insert(callesDeZonas).values({
        ayuntamientoId: motul,
        zonaId: zonaMotul!.id,
        calleId: calleMotul,
        lugarId: lugarMotul,
      }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(callesDeZonas).values({
        ayuntamientoId: ticul,
        zonaId: zonaTicul!.id,
        calleId: calleTicul,
        lugarId: lugarTicul,
      }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(callesDeZonas),
    );

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.calleId)).toContain(calleMotul);
    expect(filas.map((fila) => fila.calleId)).not.toContain(calleTicul);
  });

  it("sin tenant fijado RLS no devuelve pertenencias", async () => {
    const lugarId = await crearLugarEn(motul, "comisaria", "Sin tenant");
    const calleId = await crearCalleEn(motul, lugarId, "Calle sin tenant");
    const [zona] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({ ayuntamientoId: motul, lugarId, nombre: "Zona sin tenant" })
        .returning({ id: zonas.id }),
    );
    await withTenant(motul, (tx) =>
      tx.insert(callesDeZonas).values({
        ayuntamientoId: motul,
        zonaId: zona!.id,
        calleId,
        lugarId,
      }),
    );

    const filas = await appSinTenant`SELECT zona_id FROM calles_de_zonas`;

    expect(filas).toHaveLength(0);
  });

  it("rechaza insertar una calle de otro asentamiento por FK compuesto", async () => {
    const lugarDeZona = await crearLugarEn(motul, "comisaria", "FK zona");
    const otroLugar = await crearLugarEn(motul, "comisaria", "FK calle");
    const calleAjena = await crearCalleEn(motul, otroLugar, "Calle FK ajena");
    const [zona] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: motul,
          lugarId: lugarDeZona,
          nombre: "Zona FK",
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

  it("rechaza mover una calle con pertenencia viva a otro asentamiento", async () => {
    const lugarActual = await crearLugarEn(motul, "comisaria", "Lugar actual");
    const lugarNuevo = await crearLugarEn(motul, "comisaria", "Lugar nuevo");
    const calleId = await crearCalleEn(motul, lugarActual, "Calle en zona");
    const [zona] = await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({
          ayuntamientoId: motul,
          lugarId: lugarActual,
          nombre: "Zona viva",
        })
        .returning({ id: zonas.id }),
    );
    await withTenant(motul, (tx) =>
      tx.insert(callesDeZonas).values({
        ayuntamientoId: motul,
        zonaId: zona!.id,
        calleId,
        lugarId: lugarActual,
      }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx
          .update(calles)
          .set({ lugarId: lugarNuevo })
          .where(eq(calles.id, calleId)),
      ),
    );

    expect(motivo).toMatch(/23503|foreign key/i);
  });
});
