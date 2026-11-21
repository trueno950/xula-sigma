import { randomUUID } from "node:crypto";
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
import { hashDeClave } from "./contrasenia";
import { cuentas, sesiones } from "./esquema";
import { abrirEnCurso, esperarPendiente } from "./reactivacionEnCursoDePrueba";

/**
 * La reja del cambio obligatorio se vuelve a mirar adentro de la
 * transaccion.
 *
 * **Lo que decide no es lo que la pantalla leyo.** Entre
 * `contextoDeCambioDeClave()` y la escritura hay un viaje de ida y vuelta, y
 * en ese hueco la cuenta pudo cambiar: otra pestana ya puso la clave propia,
 * la sesion se cerro, un restablecimiento emitio una temporal nueva. Escribir
 * sin volver a mirar deja la cuenta con una clave que el dueno de esa marca
 * no emitio.
 *
 * Tres formas del mismo hueco: la marca se borro, el hash guardado ya no es
 * el que se comparo y la sesion ya no existe. Las tres tienen que rechazar sin
 * escribir una sola fila —ni la credencial, ni las sesiones, ni la bitacora—.
 *
 * El hash y la marca se cambian desde una transaccion paralela sin confirmar
 * (`abrirEnCurso`): lo que se prueba es que el valor leido **antes** de
 * abrir la transaccion de escritura se vuelve a comparar adentro, con la fila
 * bloqueada.
 */

const TEMPORAL = "clave-temporal-larga";
const NUEVA = "clave-propia-larga";

let usuarioId = "";
let sesionId = "";

const credencial = () =>
  withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila);

const sesionesDe = () =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: sesiones.id })
      .from(sesiones)
      .where(eq(sesiones.userId, usuarioId)),
  );

const trazasDe = () =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: bitacora.id })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "CAMBIAR_CONTRASENIA"),
          eq(bitacora.entidadId, usuarioId),
        ),
      ),
  );

const contexto = (marca: Date): ContextoDeCambioDeClave => ({
  ayuntamientoId: motul,
  usuarioId,
  sesionId,
  claveTemporalEn: marca,
  origen: "https://motul.xulasigma.mx",
});

const desenlaceDe = (llamada: Promise<void>) =>
  llamada.then(
    () => null,
    (error: { codigo?: string }) => error,
  );

/**
 * Una marca nueva, escrita antes de cada caso: el anterior pudo borrarla y
 * cada uno prueba un hueco distinto.
 */
const prepararMarca = async (): Promise<Date> => {
  const marca = new Date();

  await withTenant(motul, (tx) =>
    tx
      .update(cuentas)
      .set({ claveTemporalEn: marca })
      .where(eq(cuentas.userId, usuarioId)),
  );

  return marca;
};

beforeAll(async () => {
  await sembrar();

  usuarioId = await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Quien Llega Tarde",
      email: "llega-tarde@example.com",
      clave: TEMPORAL,
      rol: "OPERADOR",
      claveTemporal: true,
    }),
  ).then(({ id }) => id);

  const [sesion] = await withTenant(motul, (tx) =>
    tx
      .insert(sesiones)
      .values({
        ayuntamientoId: motul,
        userId: usuarioId,
        token: "token-de-la-reja",
        expiresAt: new Date(Date.now() + 3_600_000),
      })
      .returning({ id: sesiones.id }),
  );

  sesionId = sesion?.id ?? "";
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("el cambio obligatorio vuelve a mirar el estado", () => {
  it("rechaza si la marca se borro despues de que la reja la leyo", async () => {
    const marca = await prepararMarca();
    const antes = await credencial();

    await withTenant(motul, (tx) =>
      tx
        .update(cuentas)
        .set({ claveTemporalEn: null })
        .where(eq(cuentas.userId, usuarioId)),
    );

    const fallo = await desenlaceDe(cambiarClavePropia(contexto(marca), NUEVA));

    expect(fallo?.codigo).toBe("CAMBIO_DE_CLAVE_VENCIDO");
    expect((await credencial())?.password).toBe(antes?.password);
    await expect(sesionesDe()).resolves.toHaveLength(1);
    await expect(trazasDe()).resolves.toHaveLength(0);
  });

  it("rechaza si el hash guardado cambia entre la lectura y la escritura", async () => {
    const marca = await prepararMarca();
    const otroHash = await hashDeClave("clave-de-otra-persona");

    const cambio = await abrirEnCurso(async (tx) => {
      await tx`UPDATE cuentas SET password = ${otroHash}
        WHERE user_id = ${usuarioId}`;
    });
    await cambio.lista;

    const llamada = cambiarClavePropia(contexto(marca), NUEVA);
    await esperarPendiente(llamada);

    cambio.liberar();
    await cambio.transaccion;

    expect((await desenlaceDe(llamada))?.codigo).toBe(
      "CAMBIO_DE_CLAVE_VENCIDO",
    );
    expect((await credencial())?.password).toBe(otroHash);
    await expect(sesionesDe()).resolves.toHaveLength(1);
    await expect(trazasDe()).resolves.toHaveLength(0);
  });

  it("rechaza si la sesion desde la que se cambia ya no existe", async () => {
    const marca = await prepararMarca();

    const fallo = await desenlaceDe(
      cambiarClavePropia({ ...contexto(marca), sesionId: randomUUID() }, NUEVA),
    );

    expect(fallo?.codigo).toBe("CAMBIO_DE_CLAVE_VENCIDO");
    await expect(sesionesDe()).resolves.toHaveLength(1);
    await expect(trazasDe()).resolves.toHaveLength(0);
  });
});
