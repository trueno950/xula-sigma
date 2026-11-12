import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearReparentearCalle } from "./application/reparentearCalle";
import { esperarOperacionBloqueada } from "./carrerasDeCalleDePrueba";
import type { CalleId, LugarId } from "./domain";
import { calles } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

const reparentearCalle = crearReparentearCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

/**
 * La otra mitad de la carrera, la que llego primero: abre otra conexion,
 * bloquea el lugar destino, lo da de baja y la sostiene hasta `liberar`.
 * Mismo patron que `lugares.concurrencia.integration.test.ts`.
 */
const correrContraLugar = async (
  id: LugarId,
  operacion: () => Promise<unknown>,
): Promise<unknown> => {
  let liberar: () => void = () => {};
  let confirmar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`SELECT id FROM lugares WHERE id = ${id} FOR UPDATE`;
    await tx`UPDATE lugares SET baja_en = now() WHERE id = ${id}`;
    confirmar();
    await abierta;
  });

  await lista;
  const pendiente = operacion().catch((error: unknown) => error);
  await esperarOperacionBloqueada(pendiente);
  liberar();
  await transaccion;
  return pendiente;
};

const estadoDeLaCalle = (calleId: CalleId) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .select({ lugarId: calles.lugarId, bajaEn: calles.bajaEn })
      .from(calles)
      .where(eq(calles.id, calleId));
    return fila;
  });

/**
 * S2 de `territorio-seguimiento`: el destino se bloquea despues de la calle
 * (calle → lugar), o la baja concurrente del lugar y el movimiento no se
 * ven y queda una calle activa colgando de un lugar de baja.
 */
describe("mover una calle contra la baja concurrente de su destino", () => {
  it("espera la baja del destino y no deja la calle activa colgando de un lugar de baja", async () => {
    const origen = await crearLugar("comisaria", "Origen del movimiento");
    const destino = await crearLugar("comisaria", "Destino dado de baja");
    const calleId = await crearCalle(origen, "Calle que se mueve");

    const resultado = await correrContraLugar(destino, () =>
      reparentearCalle(calleId, destino, contextoDe()),
    );

    expect(resultado).toBeInstanceOf(NoEncontradoError);
    await expect(estadoDeLaCalle(calleId)).resolves.toMatchObject({
      lugarId: origen,
      bajaEn: null,
    });
  });
});
