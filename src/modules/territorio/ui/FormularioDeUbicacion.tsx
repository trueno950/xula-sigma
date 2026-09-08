import { Boton } from "@/shared/ui";
import { ubicarCalleAction } from "./actions/ubicarCalleAction";
import { SelectorDePunto } from "./SelectorDePunto";
import type { CalleParaPanel } from "./vistaDeCalles";

type Props = { calle: CalleParaPanel };

export function FormularioDeUbicacion({ calle }: Props) {
  return (
    <form action={ubicarCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="calleId" value={calle.id} />
      <SelectorDePunto punto={calle.punto} />
      <Boton type="submit" variante="primaria">
        Guardar ubicacion
      </Boton>
    </form>
  );
}
