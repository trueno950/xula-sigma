import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { hashDeClave, verificarClave } from "./contrasenia";
import {
  CLAVE_DE_LA_PERSONA,
  contextoDeActor,
  credencialDe,
  darDeBaja,
  filaDe,
  TEMPORAL_NUEVA,
  trazasDe,
  unaPersona,
} from "./reactivacionDePrueba";
import { reactivarUsuario } from "./reactivacionDeUsuario";

/**
 * Dos reactivaciones de la misma cuenta, a la vez.
 *
 * **La primera peticion no corre por el pool.** La suite de integracion usa
 * `DB_POOL_MAX=1`, asi que dos `reactivarUsuario` disparadas juntas se
 * serializan sobre la misma conexion: la segunda lee `baja_en` ya en NULL y
 * responde `CuentaActivaError` por la guarda, sin llegar nunca a la carrera.
 * Por eso la primera se representa como lo hace
 * `territorio/mudanzas.concurrencia.integration.test.ts`: una transaccion
 * real en `appSinTenant`, ajena al pool, que escribe lo mismo que
 * `reactivarUsuario` en el mismo orden y no confirma hasta `liberar`.
 *
 * La segunda pasa su guarda —la de la primera todavia no confirmo, asi que
 * `baja_en` se sigue leyendo distinto de NULL— y se queda esperando el lock
 * de la fila. Lo que se prueba es que ese lock la despierte rechazada: si la
 * reactivacion escribiera sin mirar `baja_en` a la vez que lo limpia, la
 * segunda pisaria la contraseña que la primera acaba de mostrar y la
 * operadora que la dicto ya no podria entrar.
 */

const CLAVE_DE_LA_SEGUNDA = "temporal-de-la-segunda";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

/** La primera reactivacion, escrita en SQL y sin confirmar hasta `liberar`. */
const primeraReactivacionAbierta = async (
  actorId: string,
  usuarioId: string,
) => {
  let confirmar: () => void = () => {};
  let liberar: () => void = () => {};
  const lista = new Promise<void>((resolve) => {
    confirmar = resolve;
  });
  const abierta = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const digest = await hashDeClave(TEMPORAL_NUEVA);

  const transaccion = enTransaccionParalela(motul, async (tx) => {
    await tx`UPDATE usuarios SET baja_en = NULL WHERE id = ${usuarioId}`;
    await tx`UPDATE cuentas
      SET password = ${digest}, clave_temporal_en = now()
      WHERE user_id = ${usuarioId}`;
    await tx`INSERT INTO bitacora (ayuntamiento_id, actor, accion, entidad, entidad_id)
      VALUES (${motul}, ${actorId}, 'REACTIVAR_USUARIO', 'usuarios', ${usuarioId})`;
    confirmar();
    await abierta;
  });

  return { lista, transaccion, liberar: () => liberar() };
};

/** Que la operacion siga pendiente: si resolvio, no hubo carrera que probar. */
const esperarPendiente = async (operacion: Promise<unknown>) => {
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

describe("dos reactivaciones simultaneas de la misma cuenta", () => {
  it("la que llega segunda responde CuentaActivaError y deja valida la clave de la primera", async () => {
    const { id } = await unaPersona();
    await darDeBaja(motul, id);
    const actor = contextoDeActor(motul, "ADMIN_MUNICIPAL");

    const primera = await primeraReactivacionAbierta(actor.usuario.id, id);
    await primera.lista;

    const segunda = reactivarUsuario(actor, {
      usuarioId: id,
      nuevaClave: CLAVE_DE_LA_SEGUNDA,
    });
    const desenlace = segunda.then(
      () => null,
      (error: { codigo?: string }) => error,
    );
    await esperarPendiente(segunda);

    primera.liberar();
    await primera.transaccion;

    expect((await desenlace)?.codigo).toBe("CUENTA_ACTIVA");

    const credencial = await credencialDe(motul, id);
    expect(
      await verificarClave(credencial?.password ?? "", TEMPORAL_NUEVA),
    ).toBe(true);
    expect(
      await verificarClave(credencial?.password ?? "", CLAVE_DE_LA_SEGUNDA),
    ).toBe(false);
    expect(
      await verificarClave(credencial?.password ?? "", CLAVE_DE_LA_PERSONA),
    ).toBe(false);
    expect((await filaDe(motul, id))?.bajaEn).toBeNull();

    const reactivaciones = (await trazasDe(motul, id)).filter(
      (traza) => traza.accion === "REACTIVAR_USUARIO",
    );
    expect(reactivaciones).toHaveLength(1);
  });
});
