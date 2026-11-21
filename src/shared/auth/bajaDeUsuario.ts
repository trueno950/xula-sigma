import { and, eq, isNull } from "drizzle-orm";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  CuentaCambiadaError,
  objetivoDe,
  trazaDe,
} from "./administracionDeUsuarios";
import type { ContextoActual } from "./contexto";
import { sesiones, usuarios } from "./esquema";
import { puedeDarDeBaja } from "./roles";

/**
 * Baja logica: marca `bajaEn` y revoca las sesiones vigentes.
 *
 * **No borra la fila**, y por eso `usuarios` no tiene `GRANT DELETE`: la
 * persona sigue siendo quien firmo las constancias que ya emitio.
 *
 * **Borra sus sesiones** (S6: «quien queda de baja pierde sus sesiones»).
 * Cerrar el alta de sesiones nuevas no alcanza: `soloSiSigueActiva` solo
 * corre al crear una (`instancia.ts`), asi que la que ya estaba abierta
 * seguiria sirviendo hasta vencer. `xula_app` tiene `GRANT DELETE` sobre
 * `sesiones` (`drizzle/0001_auth.sql`), y va en la misma transaccion que el
 * `UPDATE` de la baja: o queda fuera de la cuenta y sin sesiones, o no
 * quedo de baja.
 *
 * **Nadie se da de baja a si mismo.** El municipio tiene un solo
 * `ADMIN_MUNICIPAL` (S3), ninguna ruta limpia `bajaEn` —el SUPER_ADMIN solo
 * restablece contrasenias— y darse de baja seria un bloqueo permanente del
 * municipio entero.
 *
 * **El `bajaEn` que decide no es el que se lee arriba.** Una reactivacion
 * puede confirmar entre la guarda y la escritura: la cuenta estaba de baja,
 * la reactivacion la activo con una clave nueva —que la operadora ya mostro—
 * y esta baja la volveria a dejar afuera. El `WHERE` compara contra el valor
 * leido, que es el unico punto donde Postgres ya serializo las dos, y si la
 * fila cambio no toca nada: la transaccion se deshace y la clave de la
 * reactivacion sigue sirviendo.
 */

/** El `WHERE` que solo deja escribir si `bajaEn` es el que se leyo. */
const sinCambioDeBaja = (bajaEn: Date | null) =>
  bajaEn === null ? isNull(usuarios.bajaEn) : eq(usuarios.bajaEn, bajaEn);

export function darDeBajaUsuario(
  contexto: ContextoActual,
  datos: { usuarioId: string },
): Promise<void> {
  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const objetivo = await objetivoDe(tx, datos.usuarioId);

    if (!puedeDarDeBaja(contexto.usuario.rol, objetivo.rol)) {
      throw new NoAutorizadoError();
    }

    if (objetivo.id === contexto.usuario.id) throw new NoAutorizadoError();

    const bajadas = await tx
      .update(usuarios)
      .set({ bajaEn: new Date() })
      .where(
        and(eq(usuarios.id, objetivo.id), sinCambioDeBaja(objetivo.bajaEn)),
      )
      .returning({ id: usuarios.id });

    if (bajadas.length === 0) throw new CuentaCambiadaError();

    await tx.delete(sesiones).where(eq(sesiones.userId, objetivo.id));

    await trazaDe(tx, {
      contexto,
      accion: "BAJA_USUARIO",
      entidadId: objetivo.id,
    });
  });
}
