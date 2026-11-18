import { Boton } from "@/shared/ui";
import { nombreCompletoDe } from "../domain";
import { darDeBajaPersonaAction } from "./actions/darDeBajaPersona.action";
import type { PersonaCorregible } from "./CorregirDatos";

/**
 * S9: la baja con `darDeBajaPersona`, separada como acción de peligro y
 * detrás de un divisor, en un `<form>` nativo. La frase de confirmación dice
 * qué se pierde y qué se conserva antes de que el botón se toque: la baja
 * lógica deja de mostrarla en el listado y de permitir constancias, pero no
 * borra su historial de residencias.
 */
export function DarDeBaja({ persona }: { persona: PersonaCorregible }) {
  return (
    <form action={darDeBajaPersonaAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="personaId" value={persona.id} />
      <p className="text-[15px] text-caliza-tinta">
        {`Se da de baja a ${nombreCompletoDe(persona)} del padrón: deja de ` +
          "aparecer en el listado y ya no se le pueden emitir constancias. " +
          "Su historial de residencias se conserva."}
      </p>
      <Boton type="submit" variante="peligro">
        Dar de baja
      </Boton>
    </form>
  );
}
