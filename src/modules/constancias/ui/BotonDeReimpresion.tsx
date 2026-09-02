import { Boton, CampoDeLista } from "@/shared/ui";
import { MOTIVOS_DE_REIMPRESION } from "../domain";
import { reimprimirConstanciaAction } from "./actions/reimprimirConstanciaAction";

type Props = {
  constanciaId: string;
};

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
    <form action={reimprimirConstanciaAction} className="flex flex-col gap-4">
      <input type="hidden" name="constanciaId" value={constanciaId} />
      <CampoDeLista
        id="motivo-de-reimpresion"
        name="motivo"
        etiqueta="Motivo de reimpresion"
        marcador="Seleccione un motivo"
        opciones={MOTIVOS_DE_REIMPRESION.map((motivo) => ({
          valor: motivo,
          etiqueta: motivo,
        }))}
        ayuda="Queda registrado con quien la pidio y cuando."
      />
      <Boton type="submit">Reimprimir</Boton>
    </form>
  );
}
