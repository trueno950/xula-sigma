import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeTerritorio } from "./composicion";
import { eventosDeCalles } from "./infrastructure/esquemaDeCalles";
import { callesDeZonas } from "./infrastructure/esquemaDeCallesDeZonas";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { crearCalleEn, crearLugarEn } from "./lugarDePrueba";

/**
 * Las porciones de exportacion que `territorio` agrega, sembradas en dos
 * municipios y leidas con el tenant fijado.
 *
 * El aserto no es "no vino nada ajeno" sino la igualdad exacta contra lo que
 * cada municipio tiene: un municipio sin filas tambien deja la lista ajena
 * vacia, y el test pasaria sin probar el aislamiento.
 */

const porcionLLamada = (nombre: string) => {
  const porcion = porcionesDeTerritorio.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`La exportacion no declara "${nombre}".`);

  return porcion;
};

const valoresDe = async (
  conjunto: string,
  campo: string,
  ayuntamientoId: AyuntamientoId,
): Promise<readonly unknown[]> => {
  const filas = await withTenant(ayuntamientoId, (tx) =>
    porcionLLamada(conjunto).leer(tx),
  );

  return filas.map((fila) => (fila as Record<string, unknown>)[campo]);
};

const sembrarMunicipio = async (
  ayuntamientoId: AyuntamientoId,
  etiqueta: string,
) => {
  const lugarId = await crearLugarEn(
    ayuntamientoId,
    "comisaria",
    `Comisaria ${etiqueta}`,
  );
  const calleId = await crearCalleEn(
    ayuntamientoId,
    lugarId,
    `Calle ${etiqueta}`,
  );
  const [zona] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(zonas)
      .values({ ayuntamientoId, lugarId, nombre: `Zona ${etiqueta}` })
      .returning({ id: zonas.id }),
  );

  if (!zona) throw new Error(`No se pudo sembrar la zona de ${etiqueta}.`);

  await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(callesDeZonas)
      .values({ ayuntamientoId, zonaId: zona.id, calleId, lugarId }),
  );
  await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(eventosDeCalles)
      .values({ ayuntamientoId, calleId, naturaleza: "ALTA" }),
  );

  return { calleId, zonaId: zona.id };
};

let deMotul: { calleId: string; zonaId: string };
let deTicul: { calleId: string; zonaId: string };

beforeAll(async () => {
  await sembrar();
  deMotul = await sembrarMunicipio(motul, "Motul");
  deTicul = await sembrarMunicipio(ticul, "Ticul");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("porciones de exportacion de territorio", () => {
  it("zonas solo trae las del municipio activo", async () => {
    expect(await valoresDe("zonas", "nombre", motul)).toEqual(["Zona Motul"]);
    expect(await valoresDe("zonas", "nombre", ticul)).toEqual(["Zona Ticul"]);
  });

  it("calles_de_zonas solo trae las del municipio activo", async () => {
    expect(await valoresDe("calles_de_zonas", "zonaId", motul)).toEqual([
      deMotul.zonaId,
    ]);
    expect(await valoresDe("calles_de_zonas", "zonaId", ticul)).toEqual([
      deTicul.zonaId,
    ]);
  });

  it("eventos_de_calles solo trae los del municipio activo", async () => {
    expect(await valoresDe("eventos_de_calles", "calleId", motul)).toEqual([
      deMotul.calleId,
    ]);
    expect(await valoresDe("eventos_de_calles", "calleId", ticul)).toEqual([
      deTicul.calleId,
    ]);
  });
});
