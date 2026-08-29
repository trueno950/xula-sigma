import { registrarMudanzaAction } from "./actions/registrarMudanzaAction";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

type Props = {
  personaId: string;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (tasks.md 6.22, mismo reparto que `FormularioDeDomicilio`). `domicilioId`
 * se captura como texto y no con un `<select>`: `territorio` todavia no
 * expone un listado plano de domicilios del municipio -solo
 * `porLugarYSubarbol`/`porCalle`, los dos con un punto de partida obligado-,
 * asi que se copia del arbol de `/territorio`.
 */
export function FormularioDeMudanza({ personaId }: Props) {
  return (
    <form action={registrarMudanzaAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Registrar mudanza
      </h2>
      <input type="hidden" name="personaId" value={personaId} />
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>ID del domicilio</span>
        <input
          name="domicilioId"
          type="text"
          required
          className={CLASE_CAMPO}
        />
        <span className="text-[12px] text-caliza-apagada">
          Copielo del arbol en Territorio.
        </span>
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Registrar mudanza
      </button>
    </form>
  );
}
