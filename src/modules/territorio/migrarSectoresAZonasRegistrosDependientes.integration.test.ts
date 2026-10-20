import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { motul } from "@/shared/tenancy/municipiosDePrueba";
import {
  cerrarBaseAnterior,
  crearLugarAnterior,
  prepararBaseAnterior,
  withTenantAnterior,
} from "./conexionAnteriorAlCorteDePrueba";
import type { LugarId } from "./domain";
import { parsearRegistrosDependientes } from "./migracionDeZonasReportesDePrueba";
import { ejecutarMigracionConBloqueo } from "./migracionDeZonasRollbackDePrueba";

/**
 * Hallazgo P1 de la revision del PR 66: `reportes` e `intervenciones`
 * aceptan cualquier `lugar_id`, incluido un sector o manzana. El `DELETE`
 * de `lugares` choca contra `reportes_lugar_tenant_fk` o
 * `intervenciones_lugar_tenant_fk` (sin reparenteo automatico). Base propia
 * -sin el escenario de `migrarSectoresAZonas.integration.test.ts`- para que
 * este sea el unico fallo posible.
 */

const databaseUrl = () => {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("Falta DATABASE_URL.");
  return valor;
};

let sectorConReporteId: LugarId;
let manzanaConIntervencionId: LugarId;

/**
 * Un usuario del esquema anterior para sostener las dos FK de
 * `registrado_por_usuario_id`. `sembrarGente` siembra en el esquema vivo, y
 * el reporte de prueba cuelga del anterior.
 */
const sembrarUsuarioAnterior = async (): Promise<string> => {
  const filas = await withTenantAnterior(motul, (tx) =>
    tx.execute<{ id: string }>(sql`
      INSERT INTO usuarios (ayuntamiento_id, name, email, rol)
      VALUES (${motul}, 'Operador B3D', 'b3d@motul.mx', 'OPERADOR')
      RETURNING id
    `),
  );

  return filas[0]!.id;
};

const sembrarArbolConDependientes = async () => {
  const asentamientoId = await crearLugarAnterior({
    ayuntamientoId: motul,
    tipo: "comisaria",
    nombre: "Asentamiento con registros dependientes",
  });
  const sectorId = await crearLugarAnterior({
    ayuntamientoId: motul,
    tipo: "sector",
    nombre: "Sector con reporte",
    padreId: asentamientoId,
  });
  const manzanaId = await crearLugarAnterior({
    ayuntamientoId: motul,
    tipo: "manzana",
    nombre: "Manzana con intervencion",
    padreId: sectorId,
  });
  return { sectorId, manzanaId };
};

const sembrarReporteYIntervencion = (opciones: {
  usuarioId: string;
  sectorId: LugarId;
  manzanaId: LugarId;
}) =>
  Promise.all([
    withTenantAnterior(motul, (tx) =>
      tx.execute(sql`
        INSERT INTO reportes (
          ayuntamiento_id, folio, anio, consecutivo, tipo, estado,
          lugar_id, descripcion, registrado_por_usuario_id
        ) VALUES (
          ${motul}, 'B3D-TEST-0001', 2026, 1, 'BACHE', 'RECIBIDO',
          ${opciones.sectorId}, 'Reporte de prueba colgando de un sector',
          ${opciones.usuarioId}
        )
      `),
    ),
    withTenantAnterior(motul, (tx) =>
      tx.execute(sql`
        INSERT INTO intervenciones (
          ayuntamiento_id, tipo, estado, fecha_de_ocurrencia, lugar_id,
          descripcion, registrado_por_usuario_id
        ) VALUES (
          ${motul}, 'OBRA', 'PLANIFICADA', '2026-01-15',
          ${opciones.manzanaId},
          'Intervencion de prueba colgando de una manzana', ${opciones.usuarioId}
        )
      `),
    ),
  ]);

beforeAll(async () => {
  await prepararBaseAnterior();
  const usuarioId = await sembrarUsuarioAnterior();
  const { sectorId, manzanaId } = await sembrarArbolConDependientes();
  sectorConReporteId = sectorId;
  manzanaConIntervencionId = manzanaId;
  await sembrarReporteYIntervencion({ usuarioId, sectorId, manzanaId });
});

afterAll(cerrarBaseAnterior);

describe("migracion de sectores a zonas: registros dependientes", () => {
  it("reporta reportes e intervenciones colgando de un sector antes de que la FK revierta el DELETE", async () => {
    const resultado = ejecutarMigracionConBloqueo(databaseUrl());
    // La manzana se borra antes que el sector: la intervencion que cuelga
    // de la manzana es la que dispara la FK primero.
    expect(resultado.salida).toContain(
      'violates foreign key constraint "intervenciones_lugar_tenant_fk"',
    );
    const dependientes = parsearRegistrosDependientes(resultado.salida);
    expect(dependientes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entidad: "reportes",
          lugarId: sectorConReporteId,
        }),
        expect.objectContaining({
          entidad: "intervenciones",
          lugarId: manzanaConIntervencionId,
        }),
      ]),
    );
  });
});
