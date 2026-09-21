import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appSinTenant,
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { domicilios } from "./infrastructure/esquema";
import {
  type EscenarioDeMigracion,
  leerDomiciliosMigrados,
  leerZonasYBajas,
  sembrarEscenarioDeMigracion,
} from "./migracionDeZonasDePrueba";
import {
  ejecutarMigracion,
  ejecutarMigracionConSalida,
  leerEstadoDeIdempotencia,
  leerRestauracion,
  revertirMigracion,
} from "./migracionDeZonasRollbackDePrueba";

let escenario: EscenarioDeMigracion;
beforeAll(async () => {
  await sembrar();
  escenario = await sembrarEscenarioDeMigracion();
});
afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});
describe("migracion de sectores a zonas", () => {
  it("un UPDATE sin tenant queda bloqueado por RLS con cero filas y sin error", async () => {
    const { coloniaId, manzanaId, domicilioDeLaManzanaId } = escenario;
    const filas = await appSinTenant`
      UPDATE domicilios
      SET lugar_id = ${coloniaId}
      WHERE id = ${domicilioDeLaManzanaId}
      RETURNING id
    `;
    expect(filas).toHaveLength(0);
    const [domicilio] = await withTenant(motul, (tx) =>
      tx
        .select({ lugarId: domicilios.lugarId })
        .from(domicilios)
        .where(eq(domicilios.id, domicilioDeLaManzanaId)),
    );
    expect(domicilio?.lugarId).toBe(manzanaId);
  });
  it("mueve todos los domicilios contados y preserva cada lugar anterior", async () => {
    const {
      coloniaId,
      asentamientoId,
      sectorId,
      manzanaId,
      callePrincipalId,
      calleDeOtroAsentamientoId,
      domicilioDelSectorId,
      domicilioDeLaManzanaId,
      domicilioConCalleAjenaId,
    } = escenario;
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Falta DATABASE_URL.");
    const { salida, lugaresBorrados } = ejecutarMigracionConSalida({
      databaseUrl,
      subdominio: subdominioMotul,
    });
    const resultado = await leerDomiciliosMigrados(motul, coloniaId);

    expect(resultado.domiciliosMigrados).toEqual(
      expect.arrayContaining([
        { id: domicilioDelSectorId, lugarId: coloniaId },
        { id: domicilioDeLaManzanaId, lugarId: coloniaId },
        { id: domicilioConCalleAjenaId, lugarId: coloniaId },
      ]),
    );
    expect(resultado.entradas).toEqual(
      expect.arrayContaining([
        {
          entidadId: domicilioDelSectorId,
          origen: `script:migrar-sectores-a-zonas:${sectorId}`,
        },
        {
          entidadId: domicilioDeLaManzanaId,
          origen: `script:migrar-sectores-a-zonas:${manzanaId}`,
        },
        {
          entidadId: domicilioConCalleAjenaId,
          origen: `script:migrar-sectores-a-zonas:${sectorId}`,
        },
      ]),
    );
    const resultadoDeZonas = await leerZonasYBajas({
      ayuntamientoId: motul,
      asentamientoId,
      sectorId,
      manzanaId,
      nombreDelSector: "Sector migracion",
      nombreDeLaZonaVacia: "Sector vacio",
    });
    expect(resultadoDeZonas.zonasMigradas).toHaveLength(2);
    expect(resultadoDeZonas.zonasMigradas).toEqual(
      expect.arrayContaining([
        {
          lugarId: asentamientoId,
          nombre: "Sector migracion",
          id: expect.any(String),
        },
        {
          lugarId: asentamientoId,
          nombre: "Sector vacio",
          id: expect.any(String),
        },
      ]),
    );
    const zonaDelSector = resultadoDeZonas.zonasMigradas.find(
      ({ nombre }) => nombre === "Sector migracion",
    );
    if (!zonaDelSector) throw new Error("Falta la zona del sector migrado.");

    expect(resultadoDeZonas.membresias).toEqual([
      { zonaId: zonaDelSector.id, calleId: callePrincipalId },
    ]);
    expect(resultadoDeZonas.membresiasDeZonaVacia).toHaveLength(0);
    expect(resultadoDeZonas.membresias).not.toEqual(
      expect.arrayContaining([
        { zonaId: zonaDelSector.id, calleId: calleDeOtroAsentamientoId },
      ]),
    );
    expect(salida).toContain("calles_rechazadas");
    expect(salida).toContain(calleDeOtroAsentamientoId);
    expect(resultadoDeZonas.lugaresRestantes).toHaveLength(0);
    expect(resultadoDeZonas.bajas).toEqual(
      expect.arrayContaining([
        {
          accion: "BAJA_LUGAR",
          entidad: "lugares",
          entidadId: sectorId,
          origen: `script:migrar-sectores-a-zonas:${coloniaId}`,
        },
        {
          accion: "BAJA_LUGAR",
          entidad: "lugares",
          entidadId: manzanaId,
          origen: `script:migrar-sectores-a-zonas:${sectorId}`,
        },
      ]),
    );

    const antesDeLaSegunda = await leerEstadoDeIdempotencia({
      ayuntamientoId: motul,
    });
    ejecutarMigracion({ databaseUrl });
    const despuesDeLaSegunda = await leerEstadoDeIdempotencia({
      ayuntamientoId: motul,
    });
    expect(despuesDeLaSegunda).toEqual(antesDeLaSegunda);
    expect(despuesDeLaSegunda.lugaresSectorManzana).toHaveLength(0);

    expect(lugaresBorrados).toHaveLength(3);
    await revertirMigracion({
      ayuntamientoId: motul,
      lugaresBorrados,
    });
    const restauracion = await leerRestauracion({
      ayuntamientoId: motul,
      lugarIds: lugaresBorrados.map(({ lugarId }) => lugarId),
      domicilioIds: [
        domicilioDelSectorId,
        domicilioDeLaManzanaId,
        domicilioConCalleAjenaId,
      ],
    });
    expect(restauracion.lugares).toHaveLength(lugaresBorrados.length);
    expect(restauracion.lugares).toEqual(
      expect.arrayContaining(
        lugaresBorrados.map(({ lugarId, tipo, nombre, padreId }) => ({
          id: lugarId,
          tipo,
          nombre,
          padreId,
        })),
      ),
    );
    expect(restauracion.domicilios).toEqual(
      expect.arrayContaining([
        { id: domicilioDelSectorId, lugarId: sectorId },
        { id: domicilioDeLaManzanaId, lugarId: manzanaId },
        { id: domicilioConCalleAjenaId, lugarId: sectorId },
      ]),
    );
    expect(restauracion.domicilios).toHaveLength(3);
  });
});
