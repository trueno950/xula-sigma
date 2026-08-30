import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { intentosAcceso } from "./intentosAcceso";
import { limitarRitmoDeAcceso } from "./limitarRitmo";
import { claveDe, LIMITES, VENTANA_MINUTOS } from "./ritmo";

/**
 * La ventana corrediza contra Postgres. El unit test cubre la clave y la
 * regla del limite; lo que solo se puede verificar aca es que la ventana
 * **se vacie con el tiempo** y que los conteos no crucen municipios.
 */

const CORREO = "tesoreria@example.com";
const IP = "189.203.10.7";

const intentar = (ayuntamientoId: typeof motul, correo = CORREO, ip = IP) =>
  limitarRitmoDeAcceso(ayuntamientoId, { correo, ip });

const fallaAlIntentarSinCorreo = async (ayuntamientoId: typeof motul) => {
  try {
    await limitarRitmoDeAcceso(ayuntamientoId, { correo: null, ip: IP });
  } catch (error) {
    return error as { codigo?: string; tipo?: string };
  }

  return null;
};

const fallaAlIntentar = async (...args: Parameters<typeof intentar>) => {
  try {
    await intentar(...args);
  } catch (error) {
    return error as { codigo?: string; tipo?: string };
  }

  return null;
};

/**
 * Siembra intentos con una antiguedad dada, en vez de envejecer los ya
 * escritos.
 *
 * Envejecerlos con un `UPDATE` no funciona y **falla en silencio**, que es
 * lo peor: `intentos_acceso` no tiene `GRANT UPDATE` para `xula_app` —es de
 * solo agregado— y el rol owner tampoco puede, porque con FORCE ROW LEVEL
 * SECURITY queda sujeto a las politicas y ahi no tiene ninguna. El UPDATE
 * devuelve "0 filas" sin error y el test pasa a probar otra cosa. Es el
 * mismo trampa que ya documenta `limpiar()` para el DELETE del owner.
 */
const sembrarIntentos = (
  ayuntamientoId: typeof motul,
  cuantos: number,
  haceMinutos: number,
) =>
  withTenant(ayuntamientoId, (tx) =>
    tx.insert(intentosAcceso).values(
      Array.from({ length: cuantos }, () => ({
        ayuntamientoId,
        clave: claveDe(CORREO),
        tipo: "correo" as const,
        ocurridoEn: new Date(Date.now() - haceMinutos * 60_000),
      })),
    ),
  );

beforeAll(sembrar);

afterEach(async () => {
  await withTenant(motul, (tx) => tx.delete(intentosAcceso));
  await withTenant(ticul, (tx) => tx.delete(intentosAcceso));
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("limitarRitmo", () => {
  it("deja pasar los primeros intentos y corta en el limite", async () => {
    for (let i = 0; i < LIMITES.correo; i += 1) {
      expect(await fallaAlIntentar(motul)).toBeNull();
    }

    const fallo = await fallaAlIntentar(motul);

    expect(fallo?.codigo).toBe("RITMO_EXCEDIDO");
    expect(fallo?.tipo).toBe("correo");
  });

  it("registra tambien el intento que corta", async () => {
    /**
     * Un intento que no se cuenta es un intento gratis: quien prueba
     * contrasenias esperaria a que la ventana se vacie sin haber pagado por
     * los que hizo de mas.
     */
    for (let i = 0; i <= LIMITES.correo; i += 1) await fallaAlIntentar(motul);

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ conteo: sql<number>`count(*)::int` })
        .from(intentosAcceso)
        .where(sql`tipo = 'correo'`),
    );

    expect(fila?.conteo).toBe(LIMITES.correo + 1);
  });

  it("la ventana se vacia con el tiempo", async () => {
    /**
     * El caso que justifica que no exista `bloqueadoHasta`: pasada la
     * ventana, quien se equivoco vuelve a entrar sin que nadie lo destrabe.
     */
    await sembrarIntentos(motul, LIMITES.correo + 3, VENTANA_MINUTOS + 1);

    expect(await fallaAlIntentar(motul)).toBeNull();
  });

  it("un intento apenas dentro de la ventana todavia cuenta", async () => {
    /**
     * Control del anterior. Sin este, un corte mal puesto —o una consulta
     * que no filtre nada— dejaria "se vacia con el tiempo" siempre en verde
     * sin probar la ventana.
     */
    await sembrarIntentos(motul, LIMITES.correo, VENTANA_MINUTOS - 1);

    expect((await fallaAlIntentar(motul))?.codigo).toBe("RITMO_EXCEDIDO");
  });

  it("las dos ventanas se cuentan por separado", async () => {
    /**
     * Correos distintos desde la misma IP: la ventana de cada correo queda
     * en 1, la de la IP se llena. Si se contaran juntas, el palacio entero
     * —que sale por una sola conexion— se dejaria afuera solo.
     */
    for (let i = 0; i < LIMITES.ip; i += 1) {
      expect(
        await fallaAlIntentar(motul, `persona-${i}@example.com`),
      ).toBeNull();
    }

    const fallo = await fallaAlIntentar(motul, "recien-llegada@example.com");

    expect(fallo?.codigo).toBe("RITMO_EXCEDIDO");
    expect(fallo?.tipo).toBe("ip");
  });

  it("la ventana de Motul no cuenta para Ticul", async () => {
    /**
     * Sin esto, alguien probando contrasenias contra Motul dejaria sin
     * acceso a Ticul: un municipio podria negarle el servicio a otro. Lo
     * sostiene RLS, no un `WHERE` —`limitarRitmo` no filtra por tenant.
     */
    for (let i = 0; i <= LIMITES.correo; i += 1) await fallaAlIntentar(motul);

    expect((await fallaAlIntentar(motul))?.codigo).toBe("RITMO_EXCEDIDO");
    expect(await fallaAlIntentar(ticul)).toBeNull();
  });

  it("sin correo cuenta solo la ventana de IP", async () => {
    /**
     * El caso del cuerpo ilegible. No hay correo con que abrir esa ventana,
     * pero el intento existe y viene de algun lado: si no contara nada,
     * mandar basura seria un intento gratis.
     */
    for (let i = 0; i < LIMITES.ip; i += 1) {
      expect(await fallaAlIntentarSinCorreo(motul)).toBeNull();
    }

    const fallo = await fallaAlIntentarSinCorreo(motul);

    expect(fallo?.codigo).toBe("RITMO_EXCEDIDO");
    expect(fallo?.tipo).toBe("ip");

    // Y la ventana de correo quedo intacta: 20 intentos sin correo no
    // dejaron afuera a nadie en particular.
    expect(await fallaAlIntentar(motul, CORREO, "otra-ip")).toBeNull();
  });

  it("no guarda el correo ni la IP en claro", async () => {
    await intentar(motul);

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(intentosAcceso),
    );

    const texto = JSON.stringify(filas);

    expect(texto).not.toContain("tesoreria");
    expect(texto).not.toContain(IP);
    // Pero si guarda algo con lo que contar.
    expect(filas.map((f) => f.clave)).toContain(claveDe(CORREO));
  });
});
