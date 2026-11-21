import { and, eq, ne } from "drizzle-orm";
import { NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { credencialDe } from "./claveTemporalEnCuenta";
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
 * asi vale tambien cuando la temporal la dicto otra persona.
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

const deSuCredencial = (usuarioId: string) =>
  and(eq(cuentas.userId, usuarioId), eq(cuentas.providerId, "credential"));

export function cambiarClavePropia(
  contexto: ContextoDeCambioDeClave,
  clave: string,
): Promise<void> {
  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const credencial = await credencialDe(tx, contexto.usuarioId);

    if (!credencial?.password) throw new NoEncontradoError();

    if (await verificarClave(credencial.password, clave)) {
      throw new ClaveRepetidaError();
    }

    // Despues de la comparacion: hashear es lo caro, y una clave repetida no
    // merece pagar argon2id dos veces.
    const digest = await hashDeClave(clave);

    await tx
      .update(cuentas)
      .set({ password: digest, claveTemporalEn: null })
      .where(deSuCredencial(contexto.usuarioId));

    await tx
      .delete(sesiones)
      .where(
        and(
          eq(sesiones.userId, contexto.usuarioId),
          ne(sesiones.id, contexto.sesionId),
        ),
      );

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
