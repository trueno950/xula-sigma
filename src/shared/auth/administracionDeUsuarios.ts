import { eq } from "drizzle-orm";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ContextoActual } from "./contexto";
import { hashDeClave } from "./contrasenia";
import { cuentas, sesiones, usuarios } from "./esquema";
import { puedeDarDeBaja, puedeRestablecerContrasenia, type Rol } from "./roles";

/**
 * Los casos de uso que administran personas: restablecer su contrasenia y
 * darla de baja. La reactivacion -la otra mitad de la baja- vive en
 * `reactivacionDeUsuario.ts`, que comparte `objetivoDe` y `trazaDe` con este
 * archivo porque juntos pasaban las 200 lineas.
 *
 * **El orden de las verificaciones es la regla, no un detalle.** Primero se
 * resuelve el objetivo —y RLS decide si existe para quien pregunta—, recien
 * despues se evalua el rol. Al reves, un `ADMIN_MUNICIPAL` de Motul que
 * pregunta por un id de Ticul recibiria 403 en vez de 404, y ese 403
 * confirma que la persona existe. Con ids enumerables eso alcanza para
 * mapear quien trabaja en el municipio de al lado.
 *
 * Abren su propia transaccion en vez de recibirla —al reves que
 * `altaDePersona`, que es una primitiva usada adentro de otras— porque el
 * ayuntamiento sale del contexto del actor y asi no hay forma de que la
 * transaccion sea de un municipio y el actor de otro.
 */

/**
 * Lo que necesitan los tres casos de uso del objetivo, y nada mas.
 *
 * `bajaEn` entra aca aunque la baja y el restablecimiento no lo miren: es
 * una columna de la misma fila, y pedirla en una segunda consulta para
 * decidir si la reactivacion tiene algo que hacer dejaria dos lecturas donde
 * la regla es una.
 */
type Objetivo = { id: string; rol: Rol; bajaEn: Date | null };

/**
 * S1 de `usuarios-ux`: nadie se restablece su propia contrasenia desde el
 * panel. No es una regla de rol —`puedeRestablecerContrasenia` deja pasar al
 * `ADMIN_MUNICIPAL` sobre cualquier cuenta de su municipio, la suya
 * incluida— sino de a quien alcanza la accion. Por que vive en el servidor
 * y no solo en el listado: nota de `restablecerContraseniaAction` en
 * AGENTS.md.
 */
export class RestablecimientoPropioError extends Error {
  readonly codigo = "RESTABLECIMIENTO_PROPIO";

  constructor(mensaje = "No puede restablecer su propia contraseña.") {
    super(mensaje);
    this.name = "RestablecimientoPropioError";
  }
}

/**
 * El objetivo, o `NoEncontradoError`.
 *
 * No filtra por `ayuntamientoId`: no hace falta y seria peor. La politica
 * de la tabla ya acota el `SELECT` al tenant de la transaccion, y agregar
 * un `WHERE` a mano sugiere que el aislamiento depende de recordarlo.
 */
export async function objetivoDe(
  tx: TransaccionTenant,
  usuarioId: string,
): Promise<Objetivo> {
  const [persona] = await tx
    .select({ id: usuarios.id, rol: usuarios.rol, bajaEn: usuarios.bajaEn })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!persona) throw new NoEncontradoError();

  return persona;
}

/**
 * La traza de los casos de uso de este archivo y de la reactivacion.
 *
 * Adapta el contexto a lo que pide `registrar`, que vive en `tenancy` y no
 * puede conocer `ContextoActual` —la direccion es `auth → tenancy`—. Es
 * traduccion, no una segunda forma de escribir en la bitacora.
 */
export const trazaDe = (
  tx: TransaccionTenant,
  traza: { contexto: ContextoActual; accion: string; entidadId: string },
) =>
  registrar(tx, {
    ayuntamientoId: traza.contexto.ayuntamientoId,
    actor: traza.contexto.usuario.id,
    origen: traza.contexto.origen,
    accion: traza.accion,
    entidad: "usuarios",
    entidadId: traza.entidadId,
  });

/** Cambia la credencial de otra persona y deja traza en la misma transaccion.
 *
 * La clave que se escribe es una temporal: la marca en `cuentas` es lo que la
 * hace caducar a las 24 horas y obliga a cambiarla al entrar (S1 y S2).
 * Cualquier restablecimiento que se olvide de marcarla deja una clave que no
 * caduca nunca y nadie se entera.
 */
export function restablecerContrasenia(
  contexto: ContextoActual,
  datos: { usuarioId: string; nuevaClave: string },
): Promise<void> {
  return withTenant(contexto.ayuntamientoId, async (tx) => {
    const objetivo = await objetivoDe(tx, datos.usuarioId);

    if (!puedeRestablecerContrasenia(contexto.usuario.rol, objetivo.rol)) {
      throw new NoAutorizadoError();
    }

    if (objetivo.id === contexto.usuario.id) {
      throw new RestablecimientoPropioError();
    }

    const digest = await hashDeClave(datos.nuevaClave);

    await tx
      .update(cuentas)
      .set({ password: digest, claveTemporalEn: new Date() })
      .where(eq(cuentas.userId, objetivo.id));

    await trazaDe(tx, {
      contexto,
      accion: "RESTABLECER_CONTRASENIA",
      entidadId: objetivo.id,
    });
  });
}

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
 */
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

    await tx
      .update(usuarios)
      .set({ bajaEn: new Date() })
      .where(eq(usuarios.id, objetivo.id));

    await tx.delete(sesiones).where(eq(sesiones.userId, objetivo.id));

    await trazaDe(tx, {
      contexto,
      accion: "BAJA_USUARIO",
      entidadId: objetivo.id,
    });
  });
}
