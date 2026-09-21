import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId } from "./domain";
import { crearCalleEn, crearLugarEn, crearLugarHijoEn } from "./lugarDePrueba";
import { parsearRegistrosDependientes } from "./migracionDeZonasReportesDePrueba";
import { ejecutarMigracionConBloqueo } from "./migracionDeZonasRollbackDePrueba";

/**
 * Hallazgo P1 de la revision de CI en el PR 66: `puedeContener` es por
 * rango (`tipoDeLugar.ts`), asi que una manzana puede colgar directo de
 * una colonia o cabecera, sin sector intermedio. `calles_rechazadas` solo
 * captura una calle cuando la cadena de su lugar borrado llega a un
 * sector -la unica unidad con zona propia-; una calle bajo una manzana sin
 * sector en su cadena no tiene zona destino y antes no aparecia en ningun
 * reporte. Base propia para que este sea el unico fallo posible.
 */

const databaseUrl = () => {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("Falta DATABASE_URL.");
  return valor;
};

let manzanaSinSectorId: LugarId;
let calleSinSectorId: CalleId;

beforeAll(async () => {
  await sembrar();
  const cabeceraId = await crearLugarEn(motul, "cabecera", "Cabecera");
  const coloniaId = await crearLugarHijoEn({
    ayuntamientoId: motul,
    tipo: "colonia",
    nombre: "Colonia sin sectores",
    padreId: cabeceraId,
  });
  manzanaSinSectorId = await crearLugarHijoEn({
    ayuntamientoId: motul,
    tipo: "manzana",
    nombre: "Manzana directa bajo colonia",
    padreId: coloniaId,
  });
  calleSinSectorId = await crearCalleEn(
    motul,
    manzanaSinSectorId,
    "Calle sin sector en su cadena",
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("migracion de sectores a zonas: calle sin sector en su cadena", () => {
  it("reporta la calle como dependiente antes de que la FK revierta el DELETE", async () => {
    const resultado = ejecutarMigracionConBloqueo(databaseUrl());
    expect(resultado.salida).toContain(
      'violates foreign key constraint "calles_lugar_tenant_fk"',
    );
    expect(parsearRegistrosDependientes(resultado.salida)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entidad: "calles",
          entidadId: calleSinSectorId,
          lugarId: manzanaSinSectorId,
        }),
      ]),
    );
  });
});
