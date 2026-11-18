import { Boton, Campo } from "@/shared/ui";
import { editarPersonaAction } from "./actions/editarPersona.action";

/** Lo que la ficha necesita de la persona para corregirla. */
export type PersonaCorregible = {
  id: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  curp: string | null;
};

/**
 * S9: corregir datos con `editarPersona`, en un `<form>` nativo -sin
 * `use client`- para que funcione sin JavaScript. Los cuatro campos llegan
 * con lo que la ficha ya leyó: `editarPersona` recibe los datos completos,
 * no un parche, y una caja vacía donde había un apellido lo borraría sin
 * que la operadora lo pidiera.
 */
export function CorregirDatos({ persona }: { persona: PersonaCorregible }) {
  return (
    <form action={editarPersonaAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="personaId" value={persona.id} />
      <Campo
        id={`nombres-${persona.id}`}
        name="nombres"
        etiqueta="Nombres"
        defaultValue={persona.nombres}
        autoComplete="off"
        required
      />
      <Campo
        id={`primer-apellido-${persona.id}`}
        name="primerApellido"
        etiqueta="Primer apellido"
        defaultValue={persona.primerApellido}
        autoComplete="off"
        required
      />
      <Campo
        id={`segundo-apellido-${persona.id}`}
        name="segundoApellido"
        etiqueta="Segundo apellido"
        defaultValue={persona.segundoApellido ?? ""}
        autoComplete="off"
      />
      <Campo
        id={`curp-${persona.id}`}
        name="curp"
        etiqueta="CURP"
        defaultValue={persona.curp ?? ""}
        maxLength={18}
        autoComplete="off"
        tipografia="dato"
      />
      <Boton type="submit" variante="secundaria">
        Guardar cambios
      </Boton>
    </form>
  );
}
