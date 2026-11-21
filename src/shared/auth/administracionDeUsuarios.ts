import { eq } from "drizzle-orm";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ContextoActual } from "./contexto";
import { hashDeClave } from "./contrasenia";
import { cuentas, sesiones, usuarios } from "./esquema";
import { puedeRestablecerContrasenia, type Rol } from "./roles";

/**
 * El restablecimiento de la contrasenia de otra persona, con las piezas que
 * comparten los tres casos de uso que administran a alguien: resolver el
 * objetivo, dejar la traza y rechazar una cuenta que cambio bajo los pies.
 *
 * La baja y la reactivacion viven cada una en su archivo
 * (`bajaDeUsuario.ts`, `reactivacionDeUsuario.ts`): los tres juntos pasaban
 * las 200 lineas, y separados cada uno se lee entero.
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
 * `bajaEn` entra aca aunque el restablecimiento no lo mire: es una columna de
 * la misma fila, y pedirla en una segunda consulta para decidir si la
 * reactivacion tiene algo que hacer dejaria dos lecturas donde la regla es
 * una. Ademas es contra lo que el restablecimiento vuelve a comparar adentro
 * de su transaccion.
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
 * La cuenta cambio entre la lectura de las guardas y la escritura, o estaba
 * de baja: la clave que iba a emitirse ya no serviria, porque un restablecer
 * no activa a nadie. Lo decide la fila bloqueada, no el `if` de arriba.
 *
 * La operadora lo ve como el mensaje generico de la accion —«Intente de
 * nuevo»—, que es lo que corresponde: no hubo falla, hubo otra operacion en
 * el medio.
 */
export class CuentaCambiadaError extends Error {
  readonly codigo = "CUENTA_CAMBIADA";

  constructor(
    mensaje = "La cuenta cambió mientras se procesaba la operación.",
  ) {
    super(mensaje);
    this.name = "CuentaCambiadaError";
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
 * La traza de los casos de uso de este archivo, de la baja y de la
 * reactivacion.
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

/**
 * El `bajaEn` vigente con la fila de `usuarios` bloqueada.
 *
 * **El lock es lo que ordena las operaciones que emiten claves.** La
 * reactivacion bloquea esta misma fila con su `UPDATE` condicional, y la baja
 * tambien; tomarlo antes de escribir la credencial es lo que hace que, cuando
 * una reactivacion ya confirmo, el restablecimiento que venia detras vea el
 * `bajaEn` nuevo en vez de escribir encima de la clave que se acaba de
 * mostrar.
 */
async function bajaBajoLock(
  tx: TransaccionTenant,
  usuarioId: string,
): Promise<Date | null> {
  const [fila] = await tx
    .select({ bajaEn: usuarios.bajaEn })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .for("update");

  if (!fila) throw new NoEncontradoError();

  return fila.bajaEn;
}

/** Cambia la credencial de otra persona y deja traza en la misma transaccion.
 *
 * La clave que se escribe es una temporal: la marca en `cuentas` es lo que la
 * hace caducar a las 24 horas y obliga a cambiarla al entrar (S1 y S2).
 * Cualquier restablecimiento que se olvide de marcarla deja una clave que no
 * caduca nunca y nadie se entera.
 *
 * **Cierra las sesiones de la persona en la misma transaccion.** Una sesion
 * abierta antes del restablecimiento sobrevive al cambio de hash y cae en la
 * pantalla de cambio obligatorio, que solo pide una clave nueva dos veces:
 * desde ahi se pone una clave propia sin conocer ninguna, y una cookie
 * robada se vuelve la cuenta entera.
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

    const vigente = await bajaBajoLock(tx, objetivo.id);

    if (vigente !== null || objetivo.bajaEn !== null) {
      throw new CuentaCambiadaError();
    }

    await tx
      .update(cuentas)
      .set({ password: digest, claveTemporalEn: new Date() })
      .where(eq(cuentas.userId, objetivo.id));

    await tx.delete(sesiones).where(eq(sesiones.userId, objetivo.id));

    await trazaDe(tx, {
      contexto,
      accion: "RESTABLECER_CONTRASENIA",
      entidadId: objetivo.id,
    });
  });
}
