import {
  esRol,
  puedeDarDeBaja,
  puedeRestablecerContrasenia,
  type Rol,
} from "@/shared/auth";
import { CeldaDeApoyo, CLASES_DE_TARJETA, InsigniaDeEstado } from "@/shared/ui";
import { etiquetaDeRol } from "@/shared/ui/etiquetaDeRol";
import type { UsuarioDelPanel } from "../domain";
import { AccionesDeUsuario } from "./AccionesDeUsuario";

/**
 * El listado del ayuntamiento (S2). **Quien esta de baja sigue apareciendo**,
 * marcado y sin acciones: la baja es logica y la fila no se borra (S6), asi
 * que esconderla dejaria a la operadora sin forma de saber que esa persona
 * ya no entra.
 *
 * **Lo que cada fila ofrece se decide aca**, con las mismas reglas que
 * corren en el servidor, para no pintar un boton que la accion va a
 * rechazar: `puedeRestablecerContrasenia` deja afuera a un `SUPER_ADMIN`,
 * `puedeDarDeBaja` lo deja afuera tambien, y nadie se da de baja a si mismo
 * —el municipio tiene un solo administrador y ninguna ruta limpia `bajaEn`:
 * seria un bloqueo permanente (B2 de la verificacion de T1)—.
 *
 * **Una fila por tarjeta y no `Tabla`.** `FilaDeTabla` mide 48px fijos en
 * escritorio, y las acciones de una fila son botones de 44px: no caben ni
 * envueltos, y envueltos se superponen e interceptan el clic —lo encontro el
 * E2E, no la vista—. `ItemDeAccion` resuelve lo mismo en el panel de una
 * calle, pero ahi el contenedor crece con el `<details>`; una fila de altura
 * fija no. La tarjeta crece y los botones envuelven solos.
 */
export function ListadoDeUsuarios({
  usuarios,
  actor,
}: {
  usuarios: readonly UsuarioDelPanel[];
  actor: { id: string; rol: Rol };
}) {
  return (
    <ul aria-label="Usuarios del ayuntamiento" className="flex flex-col gap-3">
      {usuarios.map((usuario) => {
        const permisos = permisosDe(actor, usuario);

        return (
          <li
            key={usuario.id}
            className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${CLASES_DE_TARJETA}`}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold text-caliza-tinta">
                {usuario.nombre}
              </span>
              <span className="truncate text-[15px] text-caliza-apagada">
                {usuario.email}
              </span>
              <span className="flex flex-wrap items-center gap-2 pt-1">
                <CeldaDeApoyo>{etiquetaDeRol(usuario.rol)}</CeldaDeApoyo>
                <InsigniaDeEstado
                  tono={usuario.dadoDeBaja ? "error" : "exito"}
                  etiqueta={usuario.dadoDeBaja ? "De baja" : "Activo"}
                />
              </span>
            </div>
            {permisos ? (
              <AccionesDeUsuario usuarioId={usuario.id} {...permisos} />
            ) : (
              <span className="text-[13px] text-caliza-apagada">
                {usuario.dadoDeBaja
                  ? "Sin acciones: la cuenta ya no entra."
                  : "Sin acciones."}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Las dos acciones de una fila, o `null` cuando no hay ninguna.
 *
 * El `rol` de la fila llega como texto del listado; `esRol` lo estrecha y un
 * rol que no es de la plataforma no habilita nada —la base tiene un CHECK
 * que lo hace imposible, y un valor raro aca significa que algo mas se
 * rompio—.
 */
function permisosDe(
  actor: { id: string; rol: Rol },
  usuario: UsuarioDelPanel,
): { puedeRestablecer: boolean; puedeBaja: boolean } | null {
  if (usuario.dadoDeBaja || !esRol(usuario.rol)) return null;

  const puedeRestablecer = puedeRestablecerContrasenia(actor.rol, usuario.rol);
  const puedeBaja =
    puedeDarDeBaja(actor.rol, usuario.rol) && usuario.id !== actor.id;

  return puedeRestablecer || puedeBaja ? { puedeRestablecer, puedeBaja } : null;
}
