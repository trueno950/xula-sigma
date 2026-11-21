import { eq } from "drizzle-orm";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import { objetivoDe, trazaDe } from "./administracionDeUsuarios";
import type { ContextoActual } from "./contexto";
import { hashDeClave } from "./contrasenia";
import { cuentas, sesiones, usuarios } from "./esquema";
import { puedeReactivarCuenta } from "./roles";

/**
 * S3: el administrador devuelve al panel una cuenta que estaba de baja.
 *
 * **Una temporal nueva, no la de antes.** Reactivar no «deshace» la baja: la
 * cuenta vuelve a estar activa con una credencial que el sistema acaba de
 * emitir y que la operadora muestra una sola vez, igual que un
 * restablecimiento. La clave que la persona tenia queda sobrescrita por el
 * hash nuevo, asi que la anterior no vuelve a servir ni aunque alguien la
 * recuerde.
 *
 * **La marca de S1 y S2 va con el hash, en la misma transaccion** —por
 * `claveTemporalEn`, la columna que ya usa el alta—: sin ella, la clave
 * nueva seria una clave propia, no caducaria y no obligaria a cambiarla al
 * entrar.
 *
 * **Todo ocurre en una transaccion**: bajar `bajaEn`, escribir el hash con su
 * marca, revocar las sesiones que hubieran sobrevivido y dejar la traza. Si
 * alguna parte fallara por separado, una cuenta podria quedar activa con la
 * clave vieja que ya no se mostro, o activa sin nadie que sepa entrar.
 *
 * **Las guardas son las de la baja, en el mismo orden** (S3): el objetivo se
 * resuelve bajo RLS —404 para otro municipio, nunca 403, que confirmaria que
 * existe—, despues se mira el rol y despues que no sea la propia cuenta.
 *
 * **Nadie se reactiva a si mismo** y la cuenta tiene que estar de baja: una
 * cuenta activa responde `CuentaActivaError` con su propio codigo, y ni ese
 * rechazo ni los otros mueven una fila —la transaccion no llego a escribir—.
 */

/** S3: solo se reactiva lo que esta de baja; lo activo no tiene nada que hacer. */
export class CuentaActivaError extends Error {
  readonly codigo = "CUENTA_ACTIVA";

  constructor(mensaje = "Esa cuenta ya está activa.") {
    super(mensaje);
    this.name = "CuentaActivaError";
  }
}

export function reactivarUsuario(
  contexto: ContextoActual,
  datos: { usuarioId: string; nuevaClave: string },
): Promise<void> {
  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const objetivo = await objetivoDe(tx, datos.usuarioId);

    if (!puedeReactivarCuenta(contexto.usuario.rol, objetivo.rol)) {
      throw new NoAutorizadoError();
    }

    if (objetivo.id === contexto.usuario.id) throw new NoAutorizadoError();

    if (objetivo.bajaEn === null) throw new CuentaActivaError();

    // Despues de las guardas: hashear es lo caro y un rechazo no lo merece.
    const digest = await hashDeClave(datos.nuevaClave);

    await tx
      .update(usuarios)
      .set({ bajaEn: null })
      .where(eq(usuarios.id, objetivo.id));

    await tx
      .update(cuentas)
      .set({ password: digest, claveTemporalEn: new Date() })
      .where(eq(cuentas.userId, objetivo.id));

    await tx.delete(sesiones).where(eq(sesiones.userId, objetivo.id));

    await trazaDe(tx, {
      contexto,
      accion: "REACTIVAR_USUARIO",
      entidadId: objetivo.id,
    });
  });
}
