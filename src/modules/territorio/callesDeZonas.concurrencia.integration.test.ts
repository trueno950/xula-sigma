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
  type CambioDeCalle,
  esperarOperacionBloqueada,
  iniciarCarreraConSonda,
  iniciarCarreraDeCalle,
} from "./carrerasDeCalleDePrueba";
import { CalleEnZonaError, type CalleId, type ZonaId } from "./domain";
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

const darDeBajaLaCalle: CambioDeCalle = async (tx, id) => {
  await tx`UPDATE calles SET baja_en = now() WHERE id = ${id}`;
};

/**
 * Pregunta, sin soltar la calle, si la zona ya esta tomada. `NOWAIT` y no la
 * espera normal: la transaccion que pregunta ya tiene la calle, y con el
 * orden calle → zona no hay nada que esperar. Con el orden inverso el
 * `NOWAIT` responde 55P03, que es lo que el test distingue.
 */
const sondearZona =
  (zonaId: ZonaId): CambioDeCalle =>
  async (tx) => {
    await tx`SELECT id FROM zonas WHERE id = ${zonaId} FOR UPDATE NOWAIT`;
  };

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

  it("mientras el alta espera la calle la zona sigue libre: la calle se toma primero", async () => {
    const comisaria = await crearLugar("comisaria", "Carrera del orden");
    const calleId = await crearCalle(comisaria, "Calle del orden");
    const zonaId = await crearZona(comisaria, "Zona del orden");

    const carrera = iniciarCarreraConSonda(
      calleId,
      darDeBajaLaCalle,
      sondearZona(zonaId),
    );
    await carrera.lista;
    const alta = agregarCalleAZona({ zonaId, calleId }, contextoDe()).catch(
      (error: unknown) => error,
    );
    await esperarOperacionBloqueada(alta);

    carrera.liberar();
    const zonaTomada = await carrera.transaccion.then(
      () => "la zona seguia libre",
      (error: Error) => `la zona ya estaba tomada: ${error.message}`,
    );

    expect(zonaTomada).toBe("la zona seguia libre");
    expect(await alta).toBeInstanceOf(NoEncontradoError);
    await expect(contarPertenencias(calleId)).resolves.toBe(0);
  });

  /**
   * Preservacion, no carrera: con `DB_POOL_MAX=1` (proyecto `integration`)
   * una baja disparada mientras el alta espera solo hace cola por la unica
   * conexion del pool, asi que este orden no distingue el codigo anterior
   * del arreglado -lo distingue la sonda de arriba-. Queda porque es la
   * conducta que el bloqueo de la calle deja una vez que el alta confirmo.
   */
  it("despues del alta, la baja ve la pertenencia y la rechaza", async () => {
    const comisaria = await crearLugar("comisaria", "Carrera zona y calle");
    const calleId = await crearCalle(comisaria, "Calle que entra a la zona");
    const zonaId = await crearZona(comisaria, "Zona con la calle adentro");

    await expect(
      agregarCalleAZona({ zonaId, calleId }, contextoDe()),
    ).resolves.toBeUndefined();
    await expect(darDeBajaCalle(calleId, contextoDe())).rejects.toBeInstanceOf(
      CalleEnZonaError,
    );
  });
});
