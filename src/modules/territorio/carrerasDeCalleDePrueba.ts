import type { TransactionSql } from "postgres";
import { expect } from "vitest";
import {
  enTransaccionParalela,
  motul,
} from "@/shared/tenancy/municipiosDePrueba";
import type { CalleId } from "./domain";

export type CambioDeCalle = (tx: TransactionSql, id: CalleId) => Promise<void>;

export type CarreraDeCalle = {
  lista: Promise<void>;
  transaccion: Promise<void>;
  liberar: () => void;
};

export const iniciarCarreraDeCalle = (
  id: CalleId,
  cambio: CambioDeCalle,
): CarreraDeCalle => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`SELECT id FROM calles WHERE id = ${id} FOR UPDATE`;
    await cambio(tx, id);
    confirmar();
    await abierta;
  });

  return { lista, transaccion, liberar };
};

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
