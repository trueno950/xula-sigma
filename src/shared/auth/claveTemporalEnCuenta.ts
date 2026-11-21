import { and, eq } from "drizzle-orm";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { cuentas, usuarios } from "./esquema";

/**
 * Cuando una credencial es una contrasenia temporal, y hasta cuando sirve.
 *
 * La marca vive en `cuentas.clave_temporal_en` —no en `usuarios`— porque el
 * dato es de la credencial, no de la persona: el dia que exista OAuth habra
 * una fila por proveedor y solo la de `credential` tiene contrasenia. Se
 * escribe cuando alguien emite una temporal (alta, restablecimiento,
 * reactivacion) y se borra cuando la persona pone la suya.
 *
 * El reloj es el del servidor y la comparacion es de **instantes**: la
 * columna es `timestamptz` y el `Date` que devuelve el driver ya viene en
 * UTC. Comparar contra la hora del cliente dejaria la caducidad en manos de
 * quien la quiere saltear.
 */

export const HORAS_DE_VIGENCIA_DE_CLAVE_TEMPORAL = 24;

const MILISEGUNDOS_DE_VIGENCIA =
  HORAS_DE_VIGENCIA_DE_CLAVE_TEMPORAL * 60 * 60 * 1000;

/**
 * El codigo que viaja en el cuerpo del rechazo de `/api/auth/sign-in/email`.
 * La pantalla de acceso lo traduce a su mensaje; el `code` es el mismo que
 * usa Better Auth para los suyos (`INVALID_EMAIL_OR_PASSWORD`).
 */
export const CLAVE_TEMPORAL_CADUCADA = "CLAVE_TEMPORAL_CADUCADA";

/** El proveedor cuya fila guarda el hash de la contrasenia. */
const PROVEEDOR_DE_CLAVE = "credential";

export type EstadoDeClaveTemporal =
  | "propia"
  | "temporal-vigente"
  | "temporal-caducada";

/**
 * S1. Una marca ausente significa que la persona eligio su clave: no hay
 * nada que caducar. Las 24 horas son de reloj corrido desde la emision, asi
 * que el limite exacto ya cuenta como caducada.
 */
export const estadoDeClaveTemporal = (
  emitidaEn: Date | null,
  ahora: Date,
): EstadoDeClaveTemporal => {
  if (emitidaEn === null) return "propia";

  const transcurrido = ahora.getTime() - emitidaEn.getTime();

  return transcurrido >= MILISEGUNDOS_DE_VIGENCIA
    ? "temporal-caducada"
    : "temporal-vigente";
};

/** Lo que hacen falta saber de la cuenta: si esta activa y si su clave es temporal. */
export type CuentaConCredencial = {
  bajaEn: Date | null;
  claveTemporalEn: Date | null;
};

const conSuCredencial = and(
  eq(cuentas.userId, usuarios.id),
  eq(cuentas.providerId, PROVEEDOR_DE_CLAVE),
);

/**
 * Una sola consulta para las dos preguntas que hace el borde de la sesion:
 * quien entra tiene que estar activo **y** no traer una temporal caducada.
 *
 * `leftJoin` y no `innerJoin` a proposito: una persona sin credencial —un
 * alta a medio camino, un camino que todavia no existe— tiene que dar una
 * fila con la credencial en nulo, no ninguna fila. Con `innerJoin` ese caso
 * se confundiria con "no existe".
 */
export async function cuentaConCredencial(
  tx: TransaccionTenant,
  usuarioId: string,
): Promise<CuentaConCredencial | null> {
  const [fila] = await tx
    .select({
      bajaEn: usuarios.bajaEn,
      claveTemporalEn: cuentas.claveTemporalEn,
    })
    .from(usuarios)
    .leftJoin(cuentas, conSuCredencial)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  return fila ?? null;
}

/** El hash y la marca de la credencial, para cambiarla. */
export async function credencialDe(
  tx: TransaccionTenant,
  usuarioId: string,
): Promise<{ password: string | null; claveTemporalEn: Date | null } | null> {
  const [fila] = await tx
    .select({
      password: cuentas.password,
      claveTemporalEn: cuentas.claveTemporalEn,
    })
    .from(cuentas)
    .where(
      and(
        eq(cuentas.userId, usuarioId),
        eq(cuentas.providerId, PROVEEDOR_DE_CLAVE),
      ),
    )
    .limit(1);

  return fila ?? null;
}

/**
 * Marca la credencial como temporal. Se llama en la misma transaccion que
 * escribe el hash: una credencial temporal sin marca no caduca nunca, y una
 * marca sin su hash dejaria una clave propia tratada como temporal.
 */
export const marcarClaveTemporal = (
  tx: TransaccionTenant,
  usuarioId: string,
  emitidaEn: Date,
) =>
  tx
    .update(cuentas)
    .set({ claveTemporalEn: emitidaEn })
    .where(
      and(
        eq(cuentas.userId, usuarioId),
        eq(cuentas.providerId, PROVEEDOR_DE_CLAVE),
      ),
    );
