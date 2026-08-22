import { altaDePersonaAction } from "./actions/altaDePersona.action";

type Props = {
  /** `searchParams.error` de `/padron/alta`, puesto por la Server Action. */
  error?: string;
};

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

/**
 * Server Component (tasks.md 2.14): `<form action={altaDePersonaAction}>`
 * es un POST nativo del navegador, sin `"use client"`. Etiquetas siempre
 * visibles arriba del campo, nunca como placeholder (`DESIGN.md`, Inputs) —
 * un placeholder desaparece al escribir y la operadora que se distrajo
 * pierde el contexto.
 */
export function FormularioDeAltaDePersona({ error }: Props) {
  return (
    <form action={altaDePersonaAction} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Nombres</span>
        <input name="nombres" type="text" required className={CLASE_CAMPO} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Primer apellido</span>
        <input
          name="primerApellido"
          type="text"
          required
          className={CLASE_CAMPO}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Segundo apellido</span>
        <input name="segundoApellido" type="text" className={CLASE_CAMPO} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>CURP</span>
        <input
          name="curp"
          type="text"
          maxLength={18}
          className={`${CLASE_CAMPO} font-mono uppercase`}
        />
      </label>

      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Guardar
      </button>
    </form>
  );
}
