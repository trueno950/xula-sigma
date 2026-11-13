import { Boton } from "@/shared/ui";
import { darDeBajaUsuarioAction } from "./actions/darDeBajaUsuarioAction";
import { restablecerContraseniaAction } from "./actions/restablecerContraseniaAction";

/**
 * Las acciones de una fila (S5 y S6), cada una en su propio `<form>` nativo:
 * un formulario no puede enviarse a dos acciones distintas, y anidar
 * formularios no es HTML valido.
 *
 * **Quien decide que se ofrece es quien compone la fila**, no este
 * componente: la regla de rol (`puedeRestablecerContrasenia`,
 * `puedeDarDeBaja`), la de la propia cuenta y la de la baja dadas viven en
 * `ListadoDeUsuarios`, que es donde se conoce al actor. Aca solo se pinta lo
 * que llega permitido — y si no llega nada, no se pinta nada.
 *
 * Sin `"use client"` en ningun lado: el envio es el POST nativo del
 * navegador y el resultado vuelve por `redirect` + `searchParams`, que es la
 * excepcion de `AGENTS.md` para las Server Actions de formulario nativo.
 *
 * El `usuarioId` va en un campo oculto, nunca en la URL: la accion lo valida
 * como uuid y el caso de uso lo resuelve bajo RLS (S7).
 */
export function AccionesDeUsuario({
  usuarioId,
  puedeRestablecer,
  puedeBaja,
}: {
  usuarioId: string;
  puedeRestablecer: boolean;
  puedeBaja: boolean;
}) {
  if (!puedeRestablecer && !puedeBaja) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {puedeRestablecer ? (
        <form action={restablecerContraseniaAction}>
          <input type="hidden" name="usuarioId" value={usuarioId} />
          <Boton type="submit" variante="secundaria">
            Restablecer contraseña
          </Boton>
        </form>
      ) : null}
      {puedeBaja ? (
        <form action={darDeBajaUsuarioAction}>
          <input type="hidden" name="usuarioId" value={usuarioId} />
          <Boton type="submit" variante="peligro">
            Dar de baja
          </Boton>
        </form>
      ) : null}
    </div>
  );
}
