import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { verificarClave } from "./contrasenia";
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
import {
  abrirReactivacion,
  esperarPendiente,
} from "./reactivacionEnCursoDePrueba";

/**
 * Dos reactivaciones de la misma cuenta, a la vez.
 *
 * La primera corre en `abrirReactivacion` —transaccion real, ajena al pool,
 * que no confirma hasta `liberar`—: por que, en el comentario de ese archivo.
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

describe("dos reactivaciones simultaneas de la misma cuenta", () => {
  it("la que llega segunda responde CuentaActivaError y deja valida la clave de la primera", async () => {
    const { id } = await unaPersona();
    await darDeBaja(motul, id);
    const actor = contextoDeActor(motul, "ADMIN_MUNICIPAL");

    const primera = await abrirReactivacion(actor.usuario.id, id);
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
