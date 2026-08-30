import { MOTIVOS_DE_REIMPRESION } from "../domain";
import { reimprimirConstanciaAction } from "./actions/reimprimirConstanciaAction";

type Props = {
  constanciaId: string;
};

const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). El envio no navega a un PDF
 * directo -a diferencia de `BotonDeImprimir`-: primero hay que registrar la
 * reimpresion, y solo `reimprimirConstanciaAction` sabe con que
 * `reimpresionId` armar el enlace (design.md de `constancias-oficios`,
 * seccion 11).
 */
export function BotonDeReimpresion({ constanciaId }: Props) {
  return (
    <form action={reimprimirConstanciaAction} className="flex items-end gap-2">
      <input type="hidden" name="constanciaId" value={constanciaId} />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-caliza-apagada">
          Motivo de reimpresion
        </span>
        <select name="motivo" className={CLASE_CAMPO} defaultValue="">
          <option value="" disabled>
            Seleccione un motivo
          </option>
          {MOTIVOS_DE_REIMPRESION.map((motivo) => (
            <option key={motivo} value={motivo}>
              {motivo}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-4 text-[15px] font-medium text-caliza-tinta"
      >
        Reimprimir
      </button>
    </form>
  );
}
