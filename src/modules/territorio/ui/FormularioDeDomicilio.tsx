import type { CalleGuardada } from "../application/puertos";
import { altaDeDomicilioAction } from "./actions/altaDeDomicilioAction";
import { SelectorDeCalle } from "./SelectorDeCalle";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

type Props = {
  /** Precargado con la raiz que la pagina ya tiene seleccionada (mismo criterio que `FormularioDeAltaDeCalle`). */
  lugarId: string;
  calles: readonly Pick<CalleGuardada, "id" | "nombre">[];
};

/** Server Component, `<form action={...}>` nativo sin `"use client"` (tasks.md 5.16). */
export function FormularioDeDomicilio({ lugarId, calles }: Props) {
  return (
    <form action={altaDeDomicilioAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Nuevo domicilio
      </h2>
      <input type="hidden" name="lugarId" value={lugarId} />
      <label htmlFor="domicilio-calle-id" className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Calle</span>
      </label>
      <SelectorDeCalle name="calleId" id="domicilio-calle-id" calles={calles} />
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Numero</span>
        <input name="numero" type="text" className={CLASE_CAMPO} />
      </label>
      <label htmlFor="domicilio-entre-a-id" className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Entre calle</span>
      </label>
      <SelectorDeCalle
        name="entreCalleAId"
        id="domicilio-entre-a-id"
        calles={calles}
        opcional
      />
      <label htmlFor="domicilio-entre-b-id" className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Y calle</span>
      </label>
      <SelectorDeCalle
        name="entreCalleBId"
        id="domicilio-entre-b-id"
        calles={calles}
        opcional
      />
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Referencia</span>
        <input name="referencia" type="text" className={CLASE_CAMPO} />
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Dar de alta
      </button>
    </form>
  );
}
