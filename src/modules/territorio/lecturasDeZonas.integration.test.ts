import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDomiciliosDeZona } from "./application/crearDomiciliosDeZona";
import { crearLecturasDeZonas } from "./application/lecturasDeZonas";
import { type CalleId, comoZonaId, type LugarId, type ZonaId } from "./domain";
import { calles, callesDeZonas, zonas } from "./infrastructure/esquema";
import { repositorioDeCallesDeZonasSql } from "./infrastructure/repositorioDeCallesDeZonasSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { repositorioDeZonasSql } from "./infrastructure/repositorioDeZonasSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";

const lecturas = crearLecturasDeZonas(
  repositorioDeZonasSql,
  repositorioDeLugaresSql,
);
const domiciliosDeZona = crearDomiciliosDeZona(repositorioDeCallesDeZonasSql);
const ajeno = { ...contextoDe(), ayuntamientoId: ticul };

beforeAll(sembrar);
afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const insertarZona = (lugarId: LugarId, nombre: string) =>
  withTenant(motul, async (tx) => {
    const [zona] = await tx
      .insert(zonas)
      .values({ ayuntamientoId: motul, lugarId, nombre })
      .returning({ id: zonas.id });
    if (!zona) throw new Error("Zona de prueba no creada");
    return zona.id;
  });

const inexistente = comoZonaId("11111111-1111-4111-8111-111111111111");

const vincularCalles = (
  zonaId: ZonaId,
  lugarId: LugarId,
  ids: readonly CalleId[],
) =>
  withTenant(motul, (tx) =>
    tx.insert(callesDeZonas).values(
      ids.map((calleId) => ({
        ayuntamientoId: motul,
        zonaId,
        lugarId,
        calleId,
      })),
    ),
  );

const zonaConCalles = async () => {
  const raiz = await crearLugar("comisaria", "Baja de zona");
  const zona = await insertarZona(raiz, "Con calles");
  const calle = await crearCalle(raiz, "Activa");
  const baja = await crearCalle(raiz, "De baja");
  await crearCalle(raiz, "Sin pertenencia");
  await crearDomicilioEnCalle(raiz, calle, "1");
  await vincularCalles(zona, raiz, [calle, baja]);
  await withTenant(motul, (tx) =>
    tx.update(calles).set({ bajaEn: new Date() }).where(eq(calles.id, baja)),
  );
  return { raiz, zona, calle };
};

describe("lecturas activas de zonas", () => {
  it("lista por asentamiento, ordena y mantiene vacia una zona sin calles", async () => {
    const raiz = await crearLugar("comisaria", "Lecturas de zonas");
    const otra = await crearLugar("comisaria", "Otra raiz de zonas");
    const zeta = await insertarZona(raiz, "Zeta");
    const alfa = await insertarZona(raiz, "Alfa");
    await insertarZona(otra, "Fuera del filtro");
    expect(await lecturas.listarZonas(raiz, contextoDe())).toStrictEqual([
      {
        id: alfa,
        nombre: "Alfa",
        lugarId: raiz,
        asentamiento: "Lecturas de zonas",
      },
      {
        id: zeta,
        nombre: "Zeta",
        lugarId: raiz,
        asentamiento: "Lecturas de zonas",
      },
    ]);
    expect(await lecturas.zonaPorId(alfa, contextoDe())).toStrictEqual({
      id: alfa,
      nombre: "Alfa",
      lugarId: raiz,
      asentamiento: "Lecturas de zonas",
    });
    expect(await lecturas.callesDeZona(alfa, contextoDe())).toStrictEqual([]);
  });

  it("oculta zonas ajenas y rechaza su detalle y un filtro de raiz ajena", async () => {
    const raiz = await crearLugar("comisaria", "Zona propia");
    const zona = await insertarZona(raiz, "Propia");
    expect(await lecturas.listarZonas(null, ajeno)).toStrictEqual([]);
    await expect(lecturas.listarZonas(raiz, ajeno)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    await expect(lecturas.zonaPorId(zona, ajeno)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    await expect(lecturas.callesDeZona(zona, ajeno)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    await expect(
      lecturas.zonaPorId(inexistente, contextoDe()),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    const colonia = await crearLugar("colonia", "Filtro no raiz", raiz);
    await expect(
      lecturas.listarZonas(colonia, contextoDe()),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("lista solo calles activas de la zona y omite datos de una zona de baja", async () => {
    const { raiz, zona, calle } = await zonaConCalles();
    expect(await lecturas.callesDeZona(zona, contextoDe())).toStrictEqual([
      { id: calle, nombre: "Activa" },
    ]);
    expect(
      (await domiciliosDeZona(zona, contextoDe())).map((d) => d.numero),
    ).toStrictEqual(["1"]);
    await withTenant(motul, (tx) =>
      tx.update(zonas).set({ bajaEn: new Date() }).where(eq(zonas.id, zona)),
    );
    expect(await lecturas.listarZonas(raiz, contextoDe())).toStrictEqual([]);
    await expect(lecturas.zonaPorId(zona, contextoDe())).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    await expect(
      lecturas.callesDeZona(zona, contextoDe()),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(await domiciliosDeZona(zona, contextoDe())).toStrictEqual([]);
  });
});
