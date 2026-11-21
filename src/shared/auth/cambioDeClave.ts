import { and, eq, ne } from "drizzle-orm";
import { NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ContextoDeCambioDeClave } from "./contexto";
import { hashDeClave, verificarClave } from "./contrasenia";
import { cuentas, sesiones } from "./esquema";

/**
 * S2: la persona que entro con una temporal pone la suya, y con eso la
 * temporal deja de servir.
 *
 * **Tres cosas en una sola transaccion**, porque ninguna sirve sola: el hash
 * nuevo, la marca borrada —que es lo que la saca del cambio obligatorio y
 * del que ya no vuelva a caducar— y las otras sesiones revocadas. Si la
 * marca y el hash se escribieran por caminos distintos, una caida en el
 * medio dejaria una clave propia que la pantalla sigue tratando como
 * temporal, o una temporal marcada como propia.
 *
 * **La sesion desde la que se escribe sobrevive.** Quien acaba de elegir su
 * clave no queda adentro de una sesion revocada; las demas —una pestana
 * vieja, una maquina compartida, la sesion que abrio el administrador con la
 * temporal— se borran.
 *
 * **La clave nueva tiene que ser distinta de la que esta puesta.** Se
 * compara contra el hash guardado, no contra un texto que alguien recuerde:
 * asi vale tambien cuando la temporal la dicto otra persona. Esa lectura y el
 * argon2 corren **antes** de abrir la transaccion de escritura —hashear tarda
 * decenas de milisegundos y no necesita el lock de la fila—, y por eso el
 * valor leido se vuelve a comparar adentro: lo que se leyo puede haber
 * cambiado mientras tanto.
 *
 * **La segunda mirada es la que decide.** Entre la reja
 * (`contextoDeCambioDeClave()`) y la escritura hay un viaje de ida y vuelta.
 * Adentro de la transaccion se bloquea la fila de la credencial, se compara
 * la marca contra la que leyo la reja, el hash contra el que se comparo, y se
 * exige que la sesion siga existiendo. Cualquiera de las tres que no cuadre
 * rechaza sin escribir una fila: dos pestanas que cambian a la vez dejan una
 * sola clave, y no la que nadie emitio.
 */

/**
 * La unica pantalla que una sesion con clave temporal puede abrir (S2). Vive
 * aca y no en la pantalla porque la nombran cuatro archivos: el layout del
 * panel, que manda ahi; la pantalla misma; la accion, que vuelve ahi con el
 * codigo del error; y la de acceso, que no deja entrar a quien ya debe
 * cambiarla.
 */
export const RUTA_DE_CAMBIO_DE_CLAVE = "/cambiar-contrasenia";

export class ClaveRepetidaError extends Error {
  readonly codigo = "CLAVE_REPETIDA";

  constructor(
    mensaje = "La contraseña nueva tiene que ser distinta de la temporal.",
  ) {
    super(mensaje);
    this.name = "ClaveRepetidaError";
  }
}

/**
 * La cuenta cambio entre la reja y la escritura: la marca ya no es la misma,
 * el hash guardado es otro o la sesion se cerro. No es una falla —otra
 * pestana gano la carrera— y por eso la accion lo redacta con el mensaje
 * generico, que invita a reintentar.
 */
export class CambioDeClaveVencidoError extends Error {
  readonly codigo = "CAMBIO_DE_CLAVE_VENCIDO";

  constructor(
    mensaje = "La contraseña temporal ya cambió o la sesión se cerró.",
  ) {
    super(mensaje);
    this.name = "CambioDeClaveVencidoError";
  }
}

const deSuCredencial = (usuarioId: string) =>
  and(eq(cuentas.userId, usuarioId), eq(cuentas.providerId, "credential"));

/** El hash guardado, que es contra lo que se compara la clave nueva. */
async function hashGuardado(
  contexto: ContextoDeCambioDeClave,
): Promise<string> {
  const [fila] = await withTenant(contexto.ayuntamientoId, (tx) =>
    tx
      .select({ password: cuentas.password })
      .from(cuentas)
      .where(deSuCredencial(contexto.usuarioId))
      .limit(1),
  );

  if (!fila?.password) throw new NoEncontradoError();

  return fila.password;
}

/** La credencial con su fila bloqueada: el punto donde Postgres serializa. */
async function credencialBloqueada(tx: TransaccionTenant, usuarioId: string) {
  const [fila] = await tx
    .select({
      password: cuentas.password,
      claveTemporalEn: cuentas.claveTemporalEn,
    })
    .from(cuentas)
    .where(deSuCredencial(usuarioId))
    .for("update");

  if (!fila?.password) throw new NoEncontradoError();

  return fila;
}

const exigirSesionAbierta = async (
  tx: TransaccionTenant,
  contexto: ContextoDeCambioDeClave,
): Promise<void> => {
  const [sesion] = await tx
    .select({ id: sesiones.id })
    .from(sesiones)
    .where(
      and(
        eq(sesiones.id, contexto.sesionId),
        eq(sesiones.userId, contexto.usuarioId),
      ),
    )
    .limit(1);

  if (!sesion) throw new CambioDeClaveVencidoError();
};

type Claves = { guardado: string; digest: string };

async function escribirClavePropia(
  tx: TransaccionTenant,
  contexto: ContextoDeCambioDeClave,
  claves: Claves,
): Promise<void> {
  const actual = await credencialBloqueada(tx, contexto.usuarioId);
  const marca = actual.claveTemporalEn;

  if (actual.password !== claves.guardado)
    throw new CambioDeClaveVencidoError();

  if (marca?.getTime() !== contexto.claveTemporalEn.getTime()) {
    throw new CambioDeClaveVencidoError();
  }

  await exigirSesionAbierta(tx, contexto);

  await tx
    .update(cuentas)
    .set({ password: claves.digest, claveTemporalEn: null })
    .where(deSuCredencial(contexto.usuarioId));

  await tx
    .delete(sesiones)
    .where(
      and(
        eq(sesiones.userId, contexto.usuarioId),
        ne(sesiones.id, contexto.sesionId),
      ),
    );
}

export async function cambiarClavePropia(
  contexto: ContextoDeCambioDeClave,
  clave: string,
): Promise<void> {
  const guardado = await hashGuardado(contexto);

  if (await verificarClave(guardado, clave)) throw new ClaveRepetidaError();

  const digest = await hashDeClave(clave);

  await withTenant(contexto.ayuntamientoId, async (tx) => {
    await escribirClavePropia(tx, contexto, { guardado, digest });

    await registrar(tx, {
      ayuntamientoId: contexto.ayuntamientoId,
      actor: contexto.usuarioId,
      origen: contexto.origen,
      accion: "CAMBIAR_CONTRASENIA",
      entidad: "usuarios",
      entidadId: contexto.usuarioId,
    });
  });
}
