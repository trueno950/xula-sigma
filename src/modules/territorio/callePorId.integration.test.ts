import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCallePorId } from "./application/callePorId";
import { calles, eventosDeCalles } from "./infrastructure/esquema";
import { lectorDeCallesDeMapaSql } from "./infrastructure/lectorDeCallesDeMapaSql";
import {
  crearCalle,
  crearCalleEn,
  crearLugar,
  crearLugarEn,
} from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const callePorId = crearCallePorId(lectorDeCallesDeMapaSql);

const contextoEn = (ayuntamientoId: AyuntamientoId): ContextoActual => ({
  ayuntamientoId,
  usuario: { id: "550e8400-e29b-41d4-a716-446655440000", rol: "OPERADOR" },
  origen: "web",
});

describe("callePorId", () => {
  it("devuelve estado y eventos en orden estable, con ALTA excluida", async () => {
    const lugarId = await crearLugar("comisaria", "Historial orden");
    const calleId = await crearCalle(lugarId, "Calle historial");
    const ocurridoEn = new Date("2026-02-01T12:00:00.000Z");

    // Orden fisico invertido al del contrato y mismo `ocurridoEn`: el
    // desempate sale del rango fijo, no del orden de Postgres.
    await withTenant(motul, (tx) =>
      tx.insert(eventosDeCalles).values([
        { ayuntamientoId: motul, calleId, naturaleza: "UBICACION", ocurridoEn },
        { ayuntamientoId: motul, calleId, naturaleza: "ALTA", ocurridoEn },
        {
          ayuntamientoId: motul,
          calleId,
          naturaleza: "REPARENTEO",
          ocurridoEn,
        },
        { ayuntamientoId: motul, calleId, naturaleza: "RENOMBRE", ocurridoEn },
      ]),
    );

    const primera = await callePorId(calleId, contextoEn(motul));
    const segunda = await callePorId(calleId, contextoEn(motul));

    expect(primera).toMatchObject({
      id: calleId,
      nombre: "Calle historial",
      lugarId,
      punto: null,
      bajaEn: null,
    });
    expect(primera?.eventos.map((evento) => evento.naturaleza)).toEqual([
      "RENOMBRE",
      "REPARENTEO",
      "UBICACION",
    ]);
    expect(segunda?.eventos.map((evento) => evento.id)).toEqual(
      primera?.eventos.map((evento) => evento.id),
    );
  });

  it("una calle de otro municipio equivale a no encontrada", async () => {
    const lugarTicul = await crearLugarEn(ticul, "comisaria", "Historial T");
    const calleTicul = await crearCalleEn(ticul, lugarTicul, "Calle Ticul");

    await expect(callePorId(calleTicul, contextoEn(motul))).resolves.toBeNull();
  });

  it("una calle dada de baja conserva su estado y sus eventos", async () => {
    const lugarId = await crearLugar("comisaria", "Historial baja");
    const calleId = await crearCalle(lugarId, "Calle de baja historial");
    await withTenant(motul, (tx) =>
      tx
        .update(calles)
        .set({ bajaEn: new Date() })
        .where(eq(calles.id, calleId)),
    );
    await withTenant(motul, (tx) =>
      tx.insert(eventosDeCalles).values({
        ayuntamientoId: motul,
        calleId,
        naturaleza: "RENOMBRE",
        ocurridoEn: new Date("2026-02-02T12:00:00.000Z"),
      }),
    );

    const calle = await callePorId(calleId, contextoEn(motul));

    expect(calle).toMatchObject({ id: calleId, bajaEn: expect.any(Date) });
    expect(calle?.eventos).toHaveLength(1);
  });
});
