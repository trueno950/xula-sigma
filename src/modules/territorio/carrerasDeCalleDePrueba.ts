import type { TransactionSql } from "postgres";
import { expect } from "vitest";
import {
  enTransaccionParalela,
  motul,
} from "@/shared/tenancy/municipiosDePrueba";
import type { CalleId, LugarId } from "./domain";

export type CambioDeCalle = (tx: TransactionSql, id: CalleId) => Promise<void>;
export type CambioDeLugar = (tx: TransactionSql, id: LugarId) => Promise<void>;

export type CarreraDeCalle = {
  lista: Promise<void>;
  transaccion: Promise<void>;
  liberar: () => void;
};

type Senales = { confirmar: () => void; abierta: Promise<void> };

/** El andamiaje de una carrera: dos promesas y la conexion que las sostiene. */
const iniciarCarrera = (
  trabajo: (tx: TransactionSql, senales: Senales) => Promise<void>,
): CarreraDeCalle => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const senales = { confirmar: () => confirmar(), abierta };
  const transaccion = enTransaccionParalela(motul, (tx) =>
    trabajo(tx, senales),
  );

  return { lista, transaccion, liberar };
};

/** Bloquea la calle, aplica `cambio` y se queda abierta hasta `liberar`. */
export const iniciarCarreraDeCalle = (
  id: CalleId,
  cambio: CambioDeCalle,
): CarreraDeCalle =>
  iniciarCarrera(async (tx, { confirmar, abierta }) => {
    await tx`SELECT id FROM calles WHERE id = ${id} FOR UPDATE`;
    await cambio(tx, id);
    confirmar();
    await abierta;
  });

/**
 * La misma carrera con un paso mas: despues de `liberar`, la transaccion
 * corre `cambio` y despues `sonda`, sin soltar la calle. Sirve para
 * preguntarle a Postgres por un segundo lock desde la conexion que ya
 * retiene el primero: `enTransaccionParalela` es una sola conexion, asi que
 * una tercera transaccion esperaria por ella y mediria el pool en vez del
 * lock.
 */
export const iniciarCarreraConSonda = (
  id: CalleId,
  cambio: CambioDeCalle,
  sonda: CambioDeCalle,
): CarreraDeCalle =>
  iniciarCarrera(async (tx, { confirmar, abierta }) => {
    await tx`SELECT id FROM calles WHERE id = ${id} FOR UPDATE`;
    confirmar();
    await abierta;
    await cambio(tx, id);
    await sonda(tx, id);
  });

export const esperarOperacionBloqueada = async (
  operacion: Promise<unknown>,
): Promise<void> => {
  const pendiente = Symbol("pendiente");
  const resultado = await Promise.race([
    operacion.then(
      () => "resuelta" as const,
      () => "rechazada" as const,
    ),
    new Promise<typeof pendiente>((resolve) =>
      setTimeout(() => resolve(pendiente), 300),
    ),
  ]);

  expect(resultado).toBe(pendiente);
};
