import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { restablecerContrasenia } from "./administracionDeUsuarios";
import { darDeBajaUsuario } from "./bajaDeUsuario";
import { verificarClave } from "./contrasenia";
import {
  CLAVE_DE_LA_PERSONA,
  contextoDeActor,
  credencialDe,
  darDeBaja,
  filaDe,
  marcarBajaDirecta,
  TEMPORAL_NUEVA,
  unaPersona,
} from "./reactivacionDePrueba";
import {
  abrirBaja,
  abrirReactivacion,
  esperarPendiente,
} from "./reactivacionEnCursoDePrueba";

/**
 * Restablecer y dar de baja, contra una reactivacion en curso.
 *
 * **Las tres escriben la misma fila de `usuarios`**, asi que todas tienen que
 * pasar por el lock de esa fila antes de tocar la credencial. Lo que se
 * prueba es el desenlace de la que llega segunda: no alcanza con que espere,
 * tiene que volver a mirar el estado y rechazar. Sin esa segunda mirada:
 *
 * - un restablecimiento pisa la clave que una reactivacion acaba de mostrar,
 *   y la operadora que la dicto ya no puede usarla;
 * - un restablecimiento deja una clave nueva en una cuenta que quedo de baja
 *   en el mismo instante: se muestro una clave que no verifica;
 * - una baja devuelve a la baja una cuenta que la reactivacion acaba de
 *   activar con una clave nueva.
 *
 * La primera operacion de cada carrera corre en `abrirBaja` /
 * `abrirReactivacion` —transaccion real, ajena al pool— porque con
 * `DB_POOL_MAX=1` dos casos de uso disparados juntos se serializan solos y la
 * carrera no ocurre.
 */

const CLAVE_DEL_RESTABLECIMIENTO = "clave-del-restablecimiento";

const restablecer = async (usuarioId: string, clave: string) =>
  restablecerContrasenia(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
    usuarioId,
    nuevaClave: clave,
  }).then(
    () => null,
    (error: { codigo?: string }) => error,
  );

const bajar = (usuarioId: string) =>
  darDeBajaUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
    usuarioId,
  }).then(
    () => null,
    (error: { codigo?: string }) => error,
  );

/** Cuantas trazas de esa accion dejo la persona dada. */
const trazasDe = (usuarioId: string, accion: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: bitacora.id })
      .from(bitacora)
      .where(
        and(eq(bitacora.entidadId, usuarioId), eq(bitacora.accion, accion)),
      ),
  ).then((filas) => filas.length);

const verifica = async (usuarioId: string, clave: string) =>
  verificarClave((await credencialDe(motul, usuarioId))?.password ?? "", clave);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("restablecer contra una reactivacion", () => {
  it("no pisa la clave que la reactivacion acaba de mostrar", async () => {
    const { id } = await unaPersona();
    await darDeBaja(motul, id);

    const reactivacion = await abrirReactivacion(
      contextoDeActor(motul, "ADMIN_MUNICIPAL").usuario.id,
      id,
    );
    await reactivacion.lista;

    const restablecimiento = restablecer(id, CLAVE_DEL_RESTABLECIMIENTO);
    await esperarPendiente(restablecimiento);

    reactivacion.liberar();
    await reactivacion.transaccion;

    expect((await restablecimiento)?.codigo).toBe("CUENTA_CAMBIADA");
    expect(await verifica(id, TEMPORAL_NUEVA)).toBe(true);
    expect(await verifica(id, CLAVE_DEL_RESTABLECIMIENTO)).toBe(false);
    expect((await filaDe(motul, id))?.bajaEn).toBeNull();
    expect(await trazasDe(id, "RESTABLECER_CONTRASENIA")).toBe(0);
  });

  it("no deja una clave nueva en una cuenta que se da de baja en el mismo instante", async () => {
    const { id } = await unaPersona();

    const baja = await abrirBaja(
      contextoDeActor(motul, "ADMIN_MUNICIPAL").usuario.id,
      id,
    );
    await baja.lista;

    const restablecimiento = restablecer(id, CLAVE_DEL_RESTABLECIMIENTO);
    await esperarPendiente(restablecimiento);

    baja.liberar();
    await baja.transaccion;

    expect((await restablecimiento)?.codigo).toBe("CUENTA_CAMBIADA");
    expect(await verifica(id, CLAVE_DE_LA_PERSONA)).toBe(true);
    expect(await verifica(id, CLAVE_DEL_RESTABLECIMIENTO)).toBe(false);
    expect((await filaDe(motul, id))?.bajaEn).not.toBeNull();
    expect(await trazasDe(id, "RESTABLECER_CONTRASENIA")).toBe(0);
  });
});

describe("dar de baja contra una reactivacion", () => {
  it("no devuelve a la baja una cuenta que la reactivacion acaba de activar", async () => {
    const { id } = await unaPersona();
    await marcarBajaDirecta(motul, id);

    const reactivacion = await abrirReactivacion(
      contextoDeActor(motul, "ADMIN_MUNICIPAL").usuario.id,
      id,
    );
    await reactivacion.lista;

    const baja = bajar(id);
    await esperarPendiente(baja);

    reactivacion.liberar();
    await reactivacion.transaccion;

    expect((await baja)?.codigo).toBe("CUENTA_CAMBIADA");
    expect((await filaDe(motul, id))?.bajaEn).toBeNull();
    expect(await verifica(id, TEMPORAL_NUEVA)).toBe(true);
    expect(await trazasDe(id, "BAJA_USUARIO")).toBe(0);
  });
});
