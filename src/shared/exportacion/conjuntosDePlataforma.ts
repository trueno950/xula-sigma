import { usuarios } from "@/shared/auth/esquema";
import { bitacora } from "@/shared/tenancy/esquema";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { agregarPorciones, type PorcionExportable } from "./agregarPorciones";

/**
 * Los conjuntos que la plataforma sabe exportar por su cuenta. Vive en su
 * archivo y no en `exportar.ts` para que ese quede en el flujo —autorizar,
 * leer, registrar— y no en el detalle de que tablas salen.
 */

/**
 * Las columnas se listan una por una, igual que en
 * `resolverAyuntamientoPorSubdominio` y por un motivo mas fuerte: el dia
 * que `usuarios` gane una columna sensible, un `select()` pelado la mete
 * sola en un archivo que sale de la organizacion.
 *
 * **Que NO se exporta, y por que.** El codigo no puede explicar la
 * ausencia de una tabla, asi que va aca:
 *
 * - `cuentas` — lleva el hash de la contrasenia. Argon2 no se revierte,
 *   pero un volcado de hashes junto a los correos reales es material de
 *   fuerza bruta offline, y la gente reusa la clave del municipio en otro
 *   lado. No es dato del municipio: es una credencial.
 * - `sesiones` y `verificaciones` — llevan tokens vigentes. Entregarlos es
 *   entregar sesiones abiertas, no historia.
 * - `intentos_acceso` — es telemetria de seguridad de la plataforma, no
 *   registro del municipio.
 *
 * La bitacora si va: es la evidencia de quien hizo que, y es justamente lo
 * que un archivo municipal necesita conservar.
 */
const conjuntosDePlataforma = async (
  tx: TransaccionTenant,
): Promise<Record<string, readonly unknown[]>> => ({
  usuarios: await tx
    .select({
      id: usuarios.id,
      nombre: usuarios.name,
      email: usuarios.email,
      rol: usuarios.rol,
      bajaEn: usuarios.bajaEn,
      creadoEn: usuarios.createdAt,
    })
    .from(usuarios),
  /**
   * Columnas explicitas, mismo criterio que `usuarios` arriba: sin esto
   * una columna nueva de `bitacora` entraria sola al archivo entregado sin
   * que nadie la revise.
   *
   * Se lee antes de que `registrar` escriba la traza de esta exportacion,
   * asi que el archivo entregado no se incluye a si mismo. Es lo correcto:
   * esa fila todavia no existe cuando se lee.
   */
  bitacora: await tx
    .select({
      id: bitacora.id,
      ayuntamientoId: bitacora.ayuntamientoId,
      actor: bitacora.actor,
      accion: bitacora.accion,
      entidad: bitacora.entidad,
      entidadId: bitacora.entidadId,
      origen: bitacora.origen,
      ocurridoEn: bitacora.ocurridoEn,
    })
    .from(bitacora)
    .orderBy(bitacora.ocurridoEn),
});

/**
 * Los conjuntos de la plataforma y los que aportan los modulos, en un solo
 * mapa. Sale de `exportarAyuntamiento` para que esa quede en el flujo y no
 * en el armado.
 */
export const conjuntosDe = async (
  tx: TransaccionTenant,
  porciones: readonly PorcionExportable[],
): Promise<Record<string, readonly unknown[]>> =>
  agregarPorciones(tx, await conjuntosDePlataforma(tx), porciones);
