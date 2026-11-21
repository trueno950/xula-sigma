import {
  esRol,
  puedeDarDeBaja,
  puedeRestablecerContrasenia,
  type Rol,
} from "@/shared/auth";
import type { UsuarioDelPanel } from "../domain";

/**
 * Que ofrece la fila de una cuenta, o `null` cuando no ofrece nada.
 *
 * **Lo que cada fila ofrece se decide aca**, con las mismas reglas que
 * corren en el servidor, para no pintar un boton que la accion va a
 * rechazar: `puedeRestablecerContrasenia` deja afuera a un `SUPER_ADMIN`,
 * `puedeDarDeBaja` lo deja afuera tambien, nadie se da de baja a si mismo
 * —el municipio tiene un solo administrador y ninguna ruta limpia `bajaEn`:
 * seria un bloqueo permanente (B2 de la verificacion de T1)— y nadie se
 * restablece su propia contrasenia (S1 de `usuarios-ux`).
 *
 * El `rol` de la fila llega como texto del listado; `esRol` lo estrecha y un
 * rol que no es de la plataforma no habilita nada —la base tiene un CHECK
 * que lo hace imposible, y un valor raro aca significa que algo mas se
 * rompio—.
 */

export type PermisosDeCuenta = {
  puedeRestablecer: boolean;
  puedeBaja: boolean;
};

export function permisosDeCuenta(
  actor: { id: string; rol: Rol },
  usuario: UsuarioDelPanel,
): PermisosDeCuenta | null {
  if (usuario.dadoDeBaja || !esRol(usuario.rol)) return null;

  const puedeRestablecer =
    puedeRestablecerContrasenia(actor.rol, usuario.rol) &&
    usuario.id !== actor.id;
  const puedeBaja =
    puedeDarDeBaja(actor.rol, usuario.rol) && usuario.id !== actor.id;

  return puedeRestablecer || puedeBaja ? { puedeRestablecer, puedeBaja } : null;
}
