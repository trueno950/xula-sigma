import { Aviso, Boton, Campo } from "@/shared/ui";
import { altaDePersonaAction } from "./actions/altaDePersona.action";
import { SugerenciaDeDuplicados } from "./SugerenciaDeDuplicados";

type Props = {
  /** `searchParams.error` de `/padron/alta`, puesto por la Server Action. */
  error?: string;
};

/**
 * Server Component (tasks.md 2.14): `<form action={altaDePersonaAction}>`
 * es un POST nativo del navegador, sin `"use client"`.
 *
 * Cuatro campos y ni uno mas (`DESIGN.md`, Don't): cada campo justifica que
 * existe. Los dos primeros los renderiza `SugerenciaDeDuplicados`
 * (`"use client"`, tasks.md 4.25) porque necesitan estado mientras se
 * escribe; sus inputs llevan el mismo `name`, asi que este `<form>` los
 * sigue leyendo igual al enviar.
 */
export function FormularioDeAltaDePersona({ error }: Props) {
  return (
    <form action={altaDePersonaAction} className="flex flex-col gap-4">
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <SugerenciaDeDuplicados />

      <Campo
        id="segundoApellido"
        name="segundoApellido"
        etiqueta="Segundo apellido"
        ayuda="Dejar vacio si la persona no lo usa."
      />

      <Campo
        id="curp"
        name="curp"
        etiqueta="CURP"
        maxLength={18}
        ayuda="18 caracteres. Se puede completar despues."
        tipografia="dato"
      />

      <Boton type="submit" variante="primaria">
        Guardar
      </Boton>
    </form>
  );
}
