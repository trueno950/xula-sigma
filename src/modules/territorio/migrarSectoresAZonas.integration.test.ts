import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appSinTenant,
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import type { CalleId } from "./domain";
import { calles, domicilios, lugares } from "./infrastructure/esquema";
import { crearCalleEn } from "./lugarDePrueba";
import { verificarMigracionDeAmbosTenants } from "./migracionDeZonasAsercionesDePrueba";
import {
  type EscenarioDeMigracion,
  sembrarEscenarioDeMigracion,
} from "./migracionDeZonasDePrueba";
import { parsearCallesRechazadas } from "./migracionDeZonasReportesDePrueba";
import {
  ejecutarMigracion,
  ejecutarMigracionConBloqueo,
  type ejecutarMigracionConSalida,
  leerEstadoDeIdempotencia,
  leerRestauracion,
  revertirMigracion,
} from "./migracionDeZonasRollbackDePrueba";

let motulEscenario: EscenarioDeMigracion;
let ticulEscenario: EscenarioDeMigracion;
let calleDirectaTiculId: CalleId;
let calleDirectaEnManzanaTiculId: CalleId;
let lugaresBorradosDeMotul: Awaited<
  ReturnType<typeof ejecutarMigracionConSalida>
>["lugaresBorrados"];
const databaseUrl = () => {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("Falta DATABASE_URL.");
  return valor;
};
const bajaEnDelSectorMotul = new Date("2026-01-01T00:00:00Z");
const quitarBloqueoDirecto = () =>
  withTenant(ticul, async (tx) => {
    await tx
      .update(calles)
      .set({ lugarId: ticulEscenario.asentamientoId })
      .where(eq(calles.id, calleDirectaTiculId));
    await tx
      .update(calles)
      .set({ lugarId: ticulEscenario.asentamientoId })
      .where(eq(calles.id, calleDirectaEnManzanaTiculId));
  });
beforeAll(async () => {
  await sembrar();
  motulEscenario = await sembrarEscenarioDeMigracion(motul);
  ticulEscenario = await sembrarEscenarioDeMigracion(ticul);
  calleDirectaTiculId = await crearCalleEn(
    ticul,
    ticulEscenario.sectorId,
    "Calle bloqueadora",
  );
  calleDirectaEnManzanaTiculId = await crearCalleEn(
    ticul,
    ticulEscenario.manzanaId,
    "Calle bloqueadora en manzana",
  );
  await withTenant(motul, (tx) =>
    tx
      .update(lugares)
      .set({ bajaEn: bajaEnDelSectorMotul })
      .where(eq(lugares.id, motulEscenario.sectorId)),
  );
});
afterAll(async () => {
  await limpiar();
  await owner.end();
  await appSinTenant.end();
  await cerrarConexion();
});

const verificarRestauracion = (
  restauracion: Awaited<ReturnType<typeof leerRestauracion>>,
) => {
  expect(restauracion.lugares).toEqual(
    expect.arrayContaining(
      lugaresBorradosDeMotul.map(
        ({ bajaEn, lugarId, tipo, nombre, padreId }) => ({
          id: lugarId,
          tipo,
          nombre,
          padreId,
          bajaEn: bajaEn === null ? null : new Date(bajaEn),
        }),
      ),
    ),
  );
  expect(restauracion.domicilios).toEqual(
    expect.arrayContaining([
      {
        id: motulEscenario.domicilioDelSectorId,
        lugarId: motulEscenario.sectorId,
      },
      {
        id: motulEscenario.domicilioDeLaManzanaId,
        lugarId: motulEscenario.manzanaId,
      },
      {
        id: motulEscenario.domicilioConCalleAjenaId,
        lugarId: motulEscenario.sectorId,
      },
    ]),
  );
};

describe("migracion de sectores a zonas", () => {
  it("un UPDATE sin tenant queda bloqueado por RLS con cero filas y sin error", async () => {
    const filas =
      await appSinTenant`UPDATE domicilios SET lugar_id = ${motulEscenario.coloniaId} WHERE id = ${motulEscenario.domicilioDeLaManzanaId} RETURNING id`;
    expect(filas).toHaveLength(0);
    const [domicilio] = await withTenant(motul, (tx) =>
      tx
        .select({ lugarId: domicilios.lugarId })
        .from(domicilios)
        .where(eq(domicilios.id, motulEscenario.domicilioDeLaManzanaId)),
    );
    expect(domicilio?.lugarId).toBe(motulEscenario.manzanaId);
  });
  it("reporta la calle directa antes de que la FK revierta toda la migracion", async () => {
    const resultado = ejecutarMigracionConBloqueo(databaseUrl());
    expect(resultado.salida).toContain(
      'violates foreign key constraint "calles_lugar_tenant_fk"',
    );
    expect(parsearCallesRechazadas(resultado.salida)).toEqual(
      expect.arrayContaining([
        {
          subdominio: expect.stringContaining("ticul-"),
          sectorId: ticulEscenario.sectorId,
          calleId: calleDirectaEnManzanaTiculId,
          lugarRealId: ticulEscenario.manzanaId,
        },
        {
          subdominio: expect.stringContaining("ticul-"),
          sectorId: ticulEscenario.sectorId,
          calleId: calleDirectaTiculId,
          lugarRealId: ticulEscenario.sectorId,
        },
      ]),
    );
    await quitarBloqueoDirecto();
  });
  it("migra ambos tenants, conserva bajas y conserva el aislamiento", async () => {
    lugaresBorradosDeMotul = await verificarMigracionDeAmbosTenants({
      databaseUrl: databaseUrl(),
      motulEscenario,
      ticulEscenario,
      bajaEnDelSectorMotul,
    });
  });
  it("es idempotente y el rollback restaura baja_en y domicilios", async () => {
    const antes = await leerEstadoDeIdempotencia({ ayuntamientoId: motul });
    ejecutarMigracion({ databaseUrl: databaseUrl() });
    expect(await leerEstadoDeIdempotencia({ ayuntamientoId: motul })).toEqual(
      antes,
    );
    await revertirMigracion({
      ayuntamientoId: motul,
      lugaresBorrados: lugaresBorradosDeMotul,
    });
    const restauracion = await leerRestauracion({
      ayuntamientoId: motul,
      lugarIds: lugaresBorradosDeMotul.map(({ lugarId }) => lugarId),
      domicilioIds: [
        motulEscenario.domicilioDelSectorId,
        motulEscenario.domicilioDeLaManzanaId,
        motulEscenario.domicilioConCalleAjenaId,
      ],
    });
    verificarRestauracion(restauracion);
  });
});
