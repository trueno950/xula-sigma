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
import { ClaveRepetidaError, cambiarClavePropia } from "./cambioDeClave";
import { verificarClave } from "./contrasenia";
import { cuentas, sesiones } from "./esquema";
import { motivoDe } from "./genteDePrueba";

/**
 * S2 contra Postgres: poner la clave propia limpia la marca, deja de servir
 * la temporal y revoca las otras sesiones de la cuenta. La sesion desde la
 * que se cambia sobrevive —quien acaba de escribir su clave no queda
 * adentro de una sesion que ya no existe—.
 */

const TEMPORAL = "clave-temporal-larga";
const NUEVA = "clave-propia-larga";
const CORREO = "cambia-clave@example.com";

const OTRAS_SESIONES = 2;

let usuarioId = "";

const crearSesion = (indice: number) =>
  withTenant(motul, (tx) =>
    tx
      .insert(sesiones)
      .values({
        ayuntamientoId: motul,
        userId: usuarioId,
        token: `token-de-cambio-${indice}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      })
      .returning({ id: sesiones.id }),
  ).then(([fila]) => fila?.id as string);

const credencial = () =>
  withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila);

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
      .select()
      .from(bitacora)
      .where(
        and(
          eq(bitacora.accion, "CAMBIAR_CONTRASENIA"),
          eq(bitacora.entidadId, id),
        ),
      ),
  );

beforeAll(async () => {
  await sembrar();

  usuarioId = await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Quien Cambia Su Clave",
      email: CORREO,
      clave: TEMPORAL,
      rol: "OPERADOR",
      claveTemporal: true,
    }),
  ).then(({ id }) => id);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("cambiar la clave propia", () => {
  it("rechaza la misma temporal y no toca nada", async () => {
    const antes = await credencial();
    const sesionesAntes = await sesionesDe(usuarioId);

    const error = await motivoDe(() =>
      cambiarClavePropia(
        {
          ayuntamientoId: motul,
          usuarioId,
          sesionId: "sesion-que-no-existe",
          origen: "https://motul.xulasigma.mx",
        },
        TEMPORAL,
      ),
    );

    expect(error.codigo).toBe(new ClaveRepetidaError().codigo);
    expect((await credencial())?.password).toBe(antes?.password);
    expect((await credencial())?.claveTemporalEn).toEqual(
      antes?.claveTemporalEn,
    );
    await expect(sesionesDe(usuarioId)).resolves.toHaveLength(
      sesionesAntes.length,
    );
  });

  it("rechaza una clave corta y no toca nada", async () => {
    const antes = await credencial();

    const error = await motivoDe(() =>
      cambiarClavePropia(
        {
          ayuntamientoId: motul,
          usuarioId,
          sesionId: "sesion-que-no-existe",
          origen: "https://motul.xulasigma.mx",
        },
        "corta",
      ),
    );

    expect(error.codigo).toBe("CLAVE_DEBIL");
    expect((await credencial())?.password).toBe(antes?.password);
  });

  it("limpia la marca, invalida la temporal y revoca las otras sesiones", async () => {
    const propia = await crearSesion(0);
    for (let indice = 1; indice <= OTRAS_SESIONES; indice += 1) {
      await crearSesion(indice);
    }

    await cambiarClavePropia(
      {
        ayuntamientoId: motul,
        usuarioId,
        sesionId: propia,
        origen: "https://motul.xulasigma.mx",
      },
      NUEVA,
    );

    const despues = await credencial();

    expect(despues?.claveTemporalEn).toBeNull();
    expect(await verificarClave(despues?.password ?? "", NUEVA)).toBe(true);
    expect(await verificarClave(despues?.password ?? "", TEMPORAL)).toBe(false);

    const sesionesRestantes = await sesionesDe(usuarioId);
    expect(sesionesRestantes).toHaveLength(1);
    expect(sesionesRestantes[0]?.id).toBe(propia);
  });

  it("deja la traza en la bitacora, en la misma transaccion", async () => {
    const trazas = await trazasDe(usuarioId);

    expect(trazas).toHaveLength(1);
    expect(trazas[0]?.actor).toBe(usuarioId);
    expect(trazas[0]?.entidad).toBe("usuarios");
    expect(trazas[0]?.origen).toBe("https://motul.xulasigma.mx");
  });
});
