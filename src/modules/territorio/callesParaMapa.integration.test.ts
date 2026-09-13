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
import { crearCallesParaMapa } from "./application/callesParaMapa";
import { calles } from "./infrastructure/esquema";
import { lectorDeCallesDeMapaSql } from "./infrastructure/lectorDeCallesDeMapaSql";
import {
  crearCalle,
  crearCalleEn,
  crearDomicilioEnCalle,
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

const callesParaMapa = crearCallesParaMapa(lectorDeCallesDeMapaSql);

const contextoEn = (ayuntamientoId: AyuntamientoId): ContextoActual => ({
  ayuntamientoId,
  usuario: { id: "550e8400-e29b-41d4-a716-446655440000", rol: "OPERADOR" },
  origen: "web",
});

describe("callesParaMapa", () => {
  it("conserva una calle sin punto, sin coordenadas por defecto", async () => {
    const lugarId = await crearLugar("comisaria", "Mapa sin punto");
    await crearCalle(lugarId, "Calle sin punto");

    const filas = await callesParaMapa(contextoEn(motul));
    const fila = filas.find((calle) => calle.nombre === "Calle sin punto");

    expect(fila).toMatchObject({ punto: null, bajaEn: null });
  });

  it("conserva una calle dada de baja con su punto vigente y su actividad", async () => {
    const lugarId = await crearLugar("comisaria", "Mapa baja");
    const calleId = await crearCalle(lugarId, "Calle dada de baja");
    await withTenant(motul, (tx) =>
      tx
        .update(calles)
        .set({ latitud: 20.937, longitud: -89.6237, bajaEn: new Date() })
        .where(eq(calles.id, calleId)),
    );
    await crearDomicilioEnCalle(lugarId, calleId);

    const filas = await callesParaMapa(contextoEn(motul));
    const fila = filas.find((calle) => calle.id === calleId);

    expect(fila).toMatchObject({
      punto: { latitud: 20.937, longitud: -89.6237 },
      bajaEn: expect.any(Date),
    });
  });

  it("no cruza municipios: un contexto de Motul no ve calles de Ticul", async () => {
    const lugarMotul = await crearLugar("comisaria", "Mapa Motul");
    await crearCalle(lugarMotul, "Calle Motul mapa");
    const lugarTicul = await crearLugarEn(ticul, "comisaria", "Mapa Ticul");
    const calleTicul = await crearCalleEn(
      ticul,
      lugarTicul,
      "Calle Ticul mapa",
    );

    const filas = await callesParaMapa(contextoEn(motul));

    expect(filas.map((calle) => calle.id)).not.toContain(calleTicul);
  });
});
