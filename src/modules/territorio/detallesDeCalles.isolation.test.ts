import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDetallesDeCalles } from "./application/detallesDeCalles";
import { callesDeZonas } from "./infrastructure/esquema";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { lectorDeDetallesDeCallesSql } from "./infrastructure/lectorDeDetallesDeCallesSql";
import {
  crearCalleEn,
  crearDomicilioEnCalleEn,
  crearLugarEn,
} from "./lugarDePrueba";

const detallesDeCalles = crearDetallesDeCalles(lectorDeDetallesDeCallesSql);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const contextoEn = (ayuntamientoId: typeof motul) =>
  ({
    ayuntamientoId,
    usuario: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      rol: "ADMIN_MUNICIPAL",
    },
    origen: "web",
  }) as const;

/** Una zona con una calle y un domicilio, en el municipio que se pida. */
const sembrarAsentamiento = async (
  ayuntamientoId: typeof motul,
  nombre: string,
  tipo: "cabecera" | "comisaria" = "cabecera",
) => {
  const lugarId = await crearLugarEn(ayuntamientoId, tipo, nombre);
  const calleId = await crearCalleEn(
    ayuntamientoId,
    lugarId,
    `Calle ${nombre}`,
  );

  await withTenant(ayuntamientoId, async (tx) => {
    const [zona] = await tx
      .insert(zonas)
      .values({
        ayuntamientoId,
        lugarId,
        nombre: `Sector ${nombre}`,
      })
      .returning({ id: zonas.id });
    if (!zona) throw new Error("La insercion de prueba no devolvio una fila");
    await tx
      .insert(callesDeZonas)
      .values({ ayuntamientoId, zonaId: zona.id, calleId, lugarId });
  });
  await crearDomicilioEnCalleEn(ayuntamientoId, lugarId, calleId);

  return { lugarId, calleId };
};

describe("aislamiento de los detalles de calle", () => {
  it("las calles, zonas y domicilios de otro municipio nunca entran a la lectura", async () => {
    const deMotul = await sembrarAsentamiento(motul, "Motul");
    const deTicul = await sembrarAsentamiento(ticul, "Ticul");

    const enMotul = await detallesDeCalles(deMotul.lugarId, contextoEn(motul));
    const enTicul = await detallesDeCalles(deTicul.lugarId, contextoEn(ticul));

    expect(enMotul).toEqual([
      {
        calleId: deMotul.calleId,
        zona: "Sector Motul",
        domicilios: 1,
      },
    ]);
    expect(enTicul).toEqual([
      {
        calleId: deTicul.calleId,
        zona: "Sector Ticul",
        domicilios: 1,
      },
    ]);
  });

  it("pedir el asentamiento de otro municipio no devuelve sus calles", async () => {
    const deTicul = await sembrarAsentamiento(
      ticul,
      "Ticul norte",
      "comisaria",
    );

    expect(await detallesDeCalles(deTicul.lugarId, contextoEn(motul))).toEqual(
      [],
    );
  });
});
