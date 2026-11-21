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
import { altaDePersona } from "./alta";
import { cambiarClavePropia } from "./cambioDeClave";
import type { ContextoDeCambioDeClave } from "./contexto";
import { verificarClave } from "./contrasenia";
import { cuentas, sesiones } from "./esquema";
import { abrirEnCurso, esperarPendiente } from "./reactivacionEnCursoDePrueba";

/**
 * Dos cambios de clave a la vez sobre la misma cuenta marcada.
 *
 * **La que decide es la marca, no el `if` que se lee antes.** Las dos
 * peticiones leen la marca puesta, las dos pasan la reja de
 * `contextoDeCambioDeClave()` y las dos llegan a escribir. La que llega
 * segunda tiene que frenarse adentro de su transaccion —con la fila de la
 * credencial bloqueada— al ver que la marca ya no es la que leyo: sin eso,
 * la segunda pisa la clave propia que la primera acaba de elegir.
 *
 * **Por que la primera no corre por el pool.** La suite de integracion usa
 * `DB_POOL_MAX=1`, asi que dos `cambiarClavePropia` disparadas juntas se
 * serializan sobre la misma conexion y la segunda ni siquiera llega a la
 * carrera —lo que igual tiene que ganar una sola, y por eso el segundo caso
 * las dispara juntas—. El primero representa a la primera con una
 * transaccion real en `abrirEnCurso`, ajena al pool, que borra la marca y no
 * confirma hasta `liberar`: la segunda se queda esperando el lock.
 */

const TEMPORAL = "clave-temporal-larga";
const NUEVA = "clave-propia-larga";
const OTRA = "otra-clave-propia-larga";

/** La cuenta compartida del segundo caso, ya sin marca tras el primero. */
let usuarioId = "";

const credencial = (id: string = usuarioId) =>
  withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, id)),
  ).then(([fila]) => fila);

const marcaDe = async (id: string): Promise<Date> => {
  const marca = (await credencial(id))?.claveTemporalEn;

  if (!marca) throw new Error("La siembra no dejo la marca temporal.");

  return marca;
};

/** Una sesion abierta con la temporal, como la que deja el acceso. */
const abrirSesion = (userId: string, token: string) =>
  withTenant(motul, (tx) =>
    tx
      .insert(sesiones)
      .values({
        ayuntamientoId: motul,
        userId,
        token,
        expiresAt: new Date(Date.now() + 3_600_000),
      })
      .returning({ id: sesiones.id }),
  ).then(([fila]) => fila?.id ?? "");

const contextoDesde = async (
  userId: string,
  sesionId: string,
): Promise<ContextoDeCambioDeClave> => ({
  ayuntamientoId: motul,
  usuarioId: userId,
  sesionId,
  claveTemporalEn: await marcaDe(userId),
  origen: "https://motul.xulasigma.mx",
});

const sesionesDe = (id: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: sesiones.id })
      .from(sesiones)
      .where(eq(sesiones.userId, id)),
  );

const trazasDe = (id: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: bitacora.id })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "CAMBIAR_CONTRASENIA"),
          eq(bitacora.entidadId, id),
        ),
      ),
  );

/** El desenlace de una llamada, sin dejar escapar el rechazo. */
const desenlaceDe = (llamada: Promise<void>) =>
  llamada.then(
    () => null,
    (error: { codigo?: string }) => error,
  );

const unaPersona = (email: string, nombre: string) =>
  withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre,
      email,
      clave: TEMPORAL,
      rol: "OPERADOR",
      claveTemporal: true,
    }),
  ).then(({ id }) => id);

beforeAll(async () => {
  await sembrar();
  usuarioId = await unaPersona("cambia-a-la-vez@example.com", "Quien Compite");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("dos cambios de clave a la vez", () => {
  it("el que llega segundo espera el lock y no escribe si la marca ya se borro", async () => {
    const sesionSegunda = await abrirSesion(usuarioId, "token-de-la-segunda");
    const contexto = await contextoDesde(usuarioId, sesionSegunda);
    const antes = await credencial();

    const primera = await abrirEnCurso(async (tx) => {
      await tx`UPDATE cuentas SET clave_temporal_en = NULL
        WHERE user_id = ${usuarioId}`;
    });
    await primera.lista;

    const segunda = cambiarClavePropia(contexto, OTRA);
    await esperarPendiente(segunda);

    primera.liberar();
    await primera.transaccion;

    expect((await desenlaceDe(segunda))?.codigo).toBe(
      "CAMBIO_DE_CLAVE_VENCIDO",
    );
    expect((await credencial())?.password).toBe(antes?.password);
    await expect(sesionesDe(usuarioId)).resolves.toHaveLength(1);
    await expect(trazasDe(usuarioId)).resolves.toHaveLength(0);
  });

  it("dos disparados juntos: gana uno solo y el otro no deja rastro", async () => {
    const otra = await unaPersona("compite@example.com", "Quien Tambien");

    const primera = await contextoDesde(
      otra,
      await abrirSesion(otra, "token-competencia-a"),
    );
    const segunda = await contextoDesde(
      otra,
      await abrirSesion(otra, "token-competencia-b"),
    );

    const desenlaces = await Promise.all([
      desenlaceDe(cambiarClavePropia(primera, NUEVA)),
      desenlaceDe(cambiarClavePropia(segunda, OTRA)),
    ]);

    expect(desenlaces.filter((desenlace) => desenlace === null)).toHaveLength(
      1,
    );

    const final = await credencial(otra);
    const ganadoras = [
      await verificarClave(final?.password ?? "", NUEVA),
      await verificarClave(final?.password ?? "", OTRA),
    ];

    expect(final?.claveTemporalEn).toBeNull();
    expect(ganadoras.filter(Boolean)).toHaveLength(1);
    await expect(trazasDe(otra)).resolves.toHaveLength(1);
  });
});
