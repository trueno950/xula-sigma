import { Boton } from "@/shared/ui";
import { ubicarCalleAction } from "./actions/ubicarCalleAction";
import { SelectorDePunto } from "./SelectorDePunto";
import type { CalleParaPanel } from "./vistaDeCalles";

type Props = {
  raiz: string;
  nodo: string;
  calle: CalleParaPanel;
};

export function FormularioDeUbicacion({ raiz, nodo, calle }: Props) {
  return (
    <form action={ubicarCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="calles" />
      <input type="hidden" name="accion" value="ubicarCalle" />
      <input type="hidden" name="calle" value={calle.id} />
      <input type="hidden" name="calleId" value={calle.id} />
      <SelectorDePunto punto={calle.punto} />
      <Boton type="submit" variante="primaria">
        Guardar ubicación
      </Boton>
    </form>
  );
}
