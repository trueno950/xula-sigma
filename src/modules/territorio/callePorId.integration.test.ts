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

  it("devuelve el antes y el despues de un evento con payload", async () => {
    const origenId = await crearLugar("comisaria", "Origen del cambio");
    const destinoId = await crearLugar("comisaria", "Destino del cambio");
    const calleId = await crearCalle(origenId, "Calle con payload");
    const ocurridoEn = new Date("2026-02-03T12:00:00.000Z");

    await withTenant(motul, (tx) =>
      tx.insert(eventosDeCalles).values([
        {
          ayuntamientoId: motul,
          calleId,
          naturaleza: "RENOMBRE",
          ocurridoEn,
          nombreAnterior: "Calle 20",
          nombreNuevo: "Calle 20-A",
        },
        {
          ayuntamientoId: motul,
          calleId,
          naturaleza: "REPARENTEO",
          ocurridoEn,
          lugarAnteriorId: origenId,
          lugarNuevoId: destinoId,
        },
        {
          ayuntamientoId: motul,
          calleId,
          naturaleza: "UBICACION",
          ocurridoEn,
          latitudNueva: 20.97,
          longitudNueva: -89.62,
        },
      ]),
    );

    const calle = await callePorId(calleId, contextoEn(motul));
    const cambioDe = (naturaleza: string) =>
      calle?.eventos.find((evento) => evento.naturaleza === naturaleza)?.cambio;
    const sinCambio = {
      nombre: { anterior: null, nuevo: null },
      punto: { anterior: null, nuevo: null },
      lugar: { anterior: null, nuevo: null },
    };

    expect(cambioDe("RENOMBRE")).toEqual({
      ...sinCambio,
      nombre: { anterior: "Calle 20", nuevo: "Calle 20-A" },
    });
    // El nombre del lugar se resuelve por su id bajo la politica de tenant.
    expect(cambioDe("REPARENTEO")).toEqual({
      ...sinCambio,
      lugar: { anterior: "Origen del cambio", nuevo: "Destino del cambio" },
    });
    expect(cambioDe("UBICACION")).toEqual({
      ...sinCambio,
      punto: { anterior: null, nuevo: { latitud: 20.97, longitud: -89.62 } },
    });
  });

  it("un evento sin payload queda con cambio nulo en vez de inventarlo", async () => {
    const lugarId = await crearLugar("comisaria", "Historial sin payload");
    const calleId = await crearCalle(lugarId, "Calle sin payload");

    await withTenant(motul, (tx) =>
      tx.insert(eventosDeCalles).values({
        ayuntamientoId: motul,
        calleId,
        naturaleza: "RENOMBRE",
        ocurridoEn: new Date("2026-02-05T12:00:00.000Z"),
      }),
    );

    const calle = await callePorId(calleId, contextoEn(motul));

    expect(calle?.eventos).toHaveLength(1);
    expect(calle?.eventos[0]?.cambio).toBeNull();
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
