import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAgregarCalleAZona } from "./application/agregarCalleAZona";
import { crearDarDeBajaCalle } from "./application/darDeBajaCalle";
import {
  esperarOperacionBloqueada,
  iniciarBloqueoDeZona,
  iniciarCarreraDeCalle,
} from "./carrerasDeCalleDePrueba";
import { CalleEnZonaError, type CalleId } from "./domain";
import { callesDeZonas } from "./infrastructure/esquemaDeCallesDeZonas";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeZonasSql } from "./infrastructure/repositorioDeZonasSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";
import { crearZona } from "./zonaDePrueba";

const agregarCalleAZona = crearAgregarCalleAZona(repositorioDeZonasSql);
const darDeBajaCalle = crearDarDeBajaCalle(repositorioDeCallesSql);

/** La fila que el alta escribe y que S3 no puede dejar atras. */
const contarPertenencias = (calleId: CalleId) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .select({ total: count() })
      .from(callesDeZonas)
      .where(eq(callesDeZonas.calleId, calleId));
    return Number(fila?.total ?? 0);
  });

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("agregar calle a zona contra una baja concurrente", () => {
  it("espera la baja de la calle, la ve dada de baja y no deja la pertenencia", async () => {
    const comisaria = await crearLugar("comisaria", "Carrera calle y zona");
    const calleId = await crearCalle(comisaria, "Calle que se da de baja");
    const zonaId = await crearZona(comisaria, "Zona que la esperaba");

    const carrera = iniciarCarreraDeCalle(calleId, async (tx, id) => {
      await tx`UPDATE calles SET baja_en = now() WHERE id = ${id}`;
    });
    await carrera.lista;
    const alta = agregarCalleAZona({ zonaId, calleId }, contextoDe()).catch(
      (error: unknown) => error,
    );

    await esperarOperacionBloqueada(alta);
    carrera.liberar();
    await carrera.transaccion;

    expect(await alta).toBeInstanceOf(NoEncontradoError);
    await expect(contarPertenencias(calleId)).resolves.toBe(0);
  });

  it("una baja que llega mientras el alta sostiene la calle ve la pertenencia y la rechaza", async () => {
    const comisaria = await crearLugar("comisaria", "Carrera zona y calle");
    const calleId = await crearCalle(comisaria, "Calle que entra a la zona");
    const zonaId = await crearZona(comisaria, "Zona retenida");

    const carrera = iniciarBloqueoDeZona(zonaId);
    await carrera.lista;
    const alta = agregarCalleAZona({ zonaId, calleId }, contextoDe()).catch(
      (error: unknown) => error,
    );
    await esperarOperacionBloqueada(alta);

    const baja = darDeBajaCalle(calleId, contextoDe()).catch(
      (error: unknown) => error,
    );
    await esperarOperacionBloqueada(baja);
    carrera.liberar();
    await carrera.transaccion;

    await expect(alta).resolves.toBeUndefined();
    await expect(baja).resolves.toBeInstanceOf(CalleEnZonaError);
  });
});
