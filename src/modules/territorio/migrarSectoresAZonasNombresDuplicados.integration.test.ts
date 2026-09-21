import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import type { LugarId } from "./domain";
import { crearLugarEn, crearLugarHijoEn } from "./lugarDePrueba";
import { parsearZonasDuplicadas } from "./migracionDeZonasReportesDePrueba";
import { ejecutarMigracionConBloqueo } from "./migracionDeZonasRollbackDePrueba";

/**
 * Hallazgo P1 de la revision del PR 66: dos sectores del mismo asentamiento
 * con el mismo nombre -dato valido hoy en `lugares`- hacen que el `INSERT`
 * en `zonas` choque contra `zonas_tenant_lugar_nombre_idx` con un error
 * crudo de Postgres. Base propia -sin el escenario de
 * `migrarSectoresAZonas.integration.test.ts`- para que este sea el unico
 * fallo posible y el reporte se pueda verificar solo.
 */

const databaseUrl = () => {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("Falta DATABASE_URL.");
  return valor;
};

let asentamientoId: LugarId;
let sectorAId: LugarId;
let sectorBId: LugarId;

beforeAll(async () => {
  await sembrar();
  asentamientoId = await crearLugarEn(
    motul,
    "comisaria",
    "Asentamiento con sectores duplicados",
  );
  sectorAId = await crearLugarHijoEn({
    ayuntamientoId: motul,
    tipo: "sector",
    nombre: "Sector repetido",
    padreId: asentamientoId,
  });
  sectorBId = await crearLugarHijoEn({
    ayuntamientoId: motul,
    tipo: "sector",
    nombre: "Sector repetido",
    padreId: asentamientoId,
  });
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("migracion de sectores a zonas: nombres duplicados", () => {
  it("reporta sectores con el mismo nombre antes de que el indice unico revierta la migracion", async () => {
    const resultado = ejecutarMigracionConBloqueo(databaseUrl());
    expect(resultado.salida).toContain(
      'duplicate key value violates unique constraint "zonas_tenant_lugar_nombre_idx"',
    );
    expect(parsearZonasDuplicadas(resultado.salida)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          asentamientoId,
          nombre: "Sector repetido",
          sectorIds: expect.arrayContaining([sectorAId, sectorBId]),
        }),
      ]),
    );
  });
});
