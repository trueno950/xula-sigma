import { randomUUID } from "node:crypto";
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
import { crearAltaDeDomicilio } from "./application/altaDeDomicilio";
import { crearDarDeBajaCalle } from "./application/darDeBajaCalle";
import {
  type CarreraDeCalle,
  esperarOperacionBloqueada,
} from "./carrerasDeCalleDePrueba";
import {
  CalleConDomiciliosError,
  type CalleId,
  comoDomicilioId,
} from "./domain";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const iniciarInsercionDeDomicilio = (
  lugarId: string,
  calleId: CalleId,
): CarreraDeCalle => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const domicilioId = comoDomicilioId(randomUUID());
  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`
      INSERT INTO domicilios (id, ayuntamiento_id, lugar_id, calle_id)
      VALUES (${domicilioId}, ${motul}, ${lugarId}, ${calleId})
    `;
    confirmar();
    await abierta;
  });

  return { lista, transaccion, liberar };
};

const iniciarBajaParalela = (calleId: CalleId): CarreraDeCalle => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`UPDATE calles SET baja_en = now() WHERE id = ${calleId}`;
    confirmar();
    await abierta;
  });

  return { lista, transaccion, liberar };
};

describe("serializacion entre calles y domicilios", () => {
  it("la baja espera al domicilio y vuelve a contar antes de actualizar", async () => {
    const lugarId = await crearLugar("comisaria", "Carrera domicilio baja");
    const calleId = await crearCalle(lugarId, "Calle protegida");
    const carrera = iniciarInsercionDeDomicilio(lugarId, calleId);
    await carrera.lista;
    const baja = crearDarDeBajaCalle(repositorioDeCallesSql);
    const operacion = baja(calleId, contextoDe());

    await esperarOperacionBloqueada(operacion);
    carrera.liberar();
    await carrera.transaccion;
    await expect(operacion).rejects.toBeInstanceOf(CalleConDomiciliosError);

    await expect(
      withTenant(motul, (tx) =>
        repositorioDeCallesSql.buscarPorId(tx, calleId),
      ),
    ).resolves.toMatchObject({ id: calleId, bajaEn: null });
  });

  it("el alta espera a la baja antes de insertar el domicilio", async () => {
    const lugarId = await crearLugar("comisaria", "Carrera alta domicilio");
    const calleId = await crearCalle(lugarId, "Calle que se da de baja");
    const carrera = iniciarBajaParalela(calleId);
    await carrera.lista;
    const alta = crearAltaDeDomicilio(
      repositorioDeDomiciliosSql,
      repositorioDeLugaresSql,
      repositorioDeCallesSql,
    );
    const operacion = alta(
      {
        lugarId,
        calleId,
        numero: null,
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
      },
      contextoDe(),
    );

    await esperarOperacionBloqueada(operacion);
    carrera.liberar();
    await carrera.transaccion;
    await expect(operacion).rejects.toBeInstanceOf(NoEncontradoError);

    await expect(
      withTenant(motul, (tx) =>
        repositorioDeDomiciliosSql.porCalle(tx, calleId),
      ),
    ).resolves.toEqual([]);
  });
});
