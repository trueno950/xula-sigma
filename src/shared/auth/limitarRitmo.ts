import { and, eq, gt, sql } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import { intentosAcceso, type TipoIntento } from "./intentosAcceso";
import {
  claveDe,
  RitmoExcedidoError,
  superaElLimite,
  VENTANA_MINUTOS,
} from "./ritmo";

/**
 * Cuenta los intentos de la ventana. La cuenta la hace Postgres con el
 * indice `(ayuntamiento_id, clave, ocurrido_en)`; traerse las filas para
 * contarlas en TypeScript cargaria la ventana entera en memoria por cada
 * intento de acceso.
 */
async function intentosEnLaVentana(
  tx: TransaccionTenant,
  clave: string,
  tipo: TipoIntento,
): Promise<number> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);

  const [fila] = await tx
    .select({ conteo: sql<number>`count(*)::int` })
    .from(intentosAcceso)
    .where(
      and(
        eq(intentosAcceso.clave, clave),
        eq(intentosAcceso.tipo, tipo),
        gt(intentosAcceso.ocurridoEn, desde),
      ),
    );

  return fila?.conteo ?? 0;
}

/**
 * Una ventana de conteo: que tipo y sobre que valor crudo -sin hashear, eso
 * lo hace el nucleo con `claveDe`- (design.md de `constancias-oficios`,
 * seccion 12).
 */
export type Ventana = { tipo: TipoIntento; valor: string };

/**
 * El nucleo, generalizado sobre `Ventana[]`: cuenta, registra, y lanza si
 * alguna ventana estaba llena.
 *
 * **Abre su propia transaccion y lanza afuera de ella**, y ese orden es la
 * unica forma de que el intento quede anotado. La primera version recibia el
 * `tx` y lanzaba adentro: el `throw` se llevaba la transaccion y con ella el
 * registro, asi que el intento numero seis nunca se contaba. Un intento que
 * no se cuenta es un intento gratis — quien prueba contrasenias esperaria a
 * que la ventana se vacie sin haber pagado por los que hizo de mas. Lo
 * agarro `ritmo.isolation.test.ts` contando filas. Generalizar este nucleo
 * -en vez de duplicarlo para la ventana de `folio`- es la unica forma de que
 * una "hermana" no pueda reintroducir ese mismo bug sin que un tipo lo
 * impida: no hay tipo que lo impida, hay una sola funcion que lo respeta.
 *
 * Tampoco comparte transaccion con el handler de Better Auth por lo mismo:
 * si el acceso falla y esa transaccion revierte, el intento fallido —que es
 * justo el que hay que contar— desaparece.
 */
export async function limitarRitmo(
  ayuntamientoId: AyuntamientoId,
  ventanas: readonly Ventana[],
): Promise<void> {
  const claves = ventanas.map((v) => ({
    tipo: v.tipo,
    clave: claveDe(v.valor),
  }));

  const lleno = await withTenant(ayuntamientoId, async (tx) => {
    const conteos = await Promise.all(
      claves.map((v) => intentosEnLaVentana(tx, v.clave, v.tipo)),
    );

    await tx
      .insert(intentosAcceso)
      .values(
        claves.map((v) => ({ ayuntamientoId, clave: v.clave, tipo: v.tipo })),
      );

    return claves.find((v, i) => superaElLimite(v.tipo, conteos[i] as number));
  });

  if (lleno) throw new RitmoExcedidoError(lleno.tipo);
}

/**
 * La forma del acceso, sin cambios para quien la llama: envoltorio delgado
 * del nucleo generalizado (design.md de `constancias-oficios`, seccion 12).
 *
 * **El correo puede faltar y la IP nunca.** Un cuerpo que no se puede
 * leer —JSON roto, campo ausente— no tiene correo con que abrir esa
 * ventana, pero sigue siendo un intento y sigue viniendo de algun lado.
 * Saltear el limitador entero por eso dejaba una puerta: bastaba mandar
 * basura para no gastar ventana. Lo encontro la revision.
 */
export const limitarRitmoDeAcceso = (
  ayuntamientoId: AyuntamientoId,
  datos: { correo: string | null; ip: string },
): Promise<void> =>
  limitarRitmo(ayuntamientoId, [
    ...(datos.correo === null
      ? []
      : [{ tipo: "correo" as const, valor: datos.correo }]),
    { tipo: "ip" as const, valor: datos.ip },
  ]);
