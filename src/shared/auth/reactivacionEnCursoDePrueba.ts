import type { TransactionSql } from "postgres";
import {
  enTransaccionParalela,
  motul,
} from "@/shared/tenancy/municipiosDePrueba";
import { hashDeClave } from "./contrasenia";
import { TEMPORAL_NUEVA } from "./reactivacionDePrueba";

/**
 * La otra mitad de una carrera: una transaccion real, ajena al pool, que
 * escribe lo mismo que el caso de uso en el mismo orden y no confirma hasta
 * que el test la libera.
 *
 * **Por que no basta con `Promise.all`.** La suite de integracion corre con
 * `DB_POOL_MAX=1`, asi que dos casos de uso disparados juntos comparten la
 * unica conexion del pool y se serializan solos: la carrera nunca ocurre. La
 * conexion de `enTransaccionParalela` es independiente, y `begin` mantiene la
 * transaccion abierta, que es lo que hace que la otra peticion espere el lock
 * de la fila. Mismo patron que `reactivacionConcurrente.integration.test.ts`
 * y `territorio/mudanzas.concurrencia.integration.test.ts`.
 *
 * No es un `*.test.ts`, asi que vitest no la recoge como suite. El orden de
 * las escrituras es el del caso de uso —`usuarios`, despues `cuentas`,
 * despues la bitacora—: invertirlo aqui probaria un orden que la aplicacion
 * no tiene.
 */

export type EnCurso = {
  /** Resuelve cuando la transaccion ya escribio y quedo esperando. */
  lista: Promise<void>;
  /** Resuelve cuando el test libero la transaccion. */
  transaccion: Promise<void>;
  liberar: () => void;
};

/**
 * Una transaccion paralela cualquiera: escribe y espera sin confirmar.
 *
 * `enCurso` arma el par de promesas que le da al test el control del
 * momento: `lista` resuelve cuando ya escribio —y por lo tanto tiene los
 * locks— y `liberar` es lo que la deja terminar.
 */
export const abrirEnCurso = async (
  escribir: (tx: TransactionSql) => Promise<void>,
): Promise<EnCurso> => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });

  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await escribir(tx);
    confirmar();
    await abierta;
  });

  return { lista, transaccion, liberar: () => liberar() };
};

/** Una reactivacion completa —baja limpia, clave nueva marcada y traza—. */
export async function abrirReactivacion(
  actorId: string,
  usuarioId: string,
): Promise<EnCurso> {
  const digest = await hashDeClave(TEMPORAL_NUEVA);

  return abrirEnCurso(async (tx) => {
    await tx`UPDATE usuarios SET baja_en = NULL WHERE id = ${usuarioId}`;
    await tx`UPDATE cuentas
      SET password = ${digest}, clave_temporal_en = now()
      WHERE user_id = ${usuarioId}`;
    await tx`INSERT INTO bitacora (ayuntamiento_id, actor, accion, entidad, entidad_id)
      VALUES (${motul}, ${actorId}, 'REACTIVAR_USUARIO', 'usuarios', ${usuarioId})`;
  });
}

/** Una baja logica con su traza: el otro par que se pisa con la reactivacion. */
export function abrirBaja(
  actorId: string,
  usuarioId: string,
): Promise<EnCurso> {
  return abrirEnCurso(async (tx) => {
    await tx`UPDATE usuarios SET baja_en = now() WHERE id = ${usuarioId}`;
    await tx`INSERT INTO bitacora (ayuntamiento_id, actor, accion, entidad, entidad_id)
      VALUES (${motul}, ${actorId}, 'BAJA_USUARIO', 'usuarios', ${usuarioId})`;
  });
}

/** Que la operacion siga pendiente: si resolvio, no hubo carrera que probar. */
export async function esperarPendiente(
  operacion: Promise<unknown>,
): Promise<void> {
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

  if (resultado !== pendiente) {
    throw new Error(
      "La operacion no espero el lock: termino antes de que se liberara.",
    );
  }
}
