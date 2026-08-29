import type { CalleGuardada } from "../application/puertos";
import { renombrarCalleAction } from "./actions/renombrarCalleAction";
import { SelectorDeCalle } from "./SelectorDeCalle";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

type Props = {
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
};

/** Server Component, `<form action={...}>` nativo sin `"use client"`. */
export function FormularioDeRenombreDeCalle({ calles }: Props) {
  return (
    <form action={renombrarCalleAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Renombrar calle
      </h2>
      <label htmlFor="renombrar-calle-id" className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Calle</span>
      </label>
      <SelectorDeCalle name="id" id="renombrar-calle-id" calles={calles} />
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Nombre nuevo</span>
        <input name="nombre" type="text" className={CLASE_CAMPO} />
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Renombrar
      </button>
    </form>
  );
}
