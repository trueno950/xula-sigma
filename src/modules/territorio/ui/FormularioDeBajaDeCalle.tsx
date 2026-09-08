import { Boton } from "@/shared/ui";
import { darDeBajaCalleAction } from "./actions/darDeBajaCalleAction";
import type { CalleParaPanel } from "./vistaDeCalles";

type Props = { calle: CalleParaPanel };

export function FormularioDeBajaDeCalle({ calle }: Props) {
  return (
    <form action={darDeBajaCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="calleId" value={calle.id} />
      <p className="text-[15px] text-caliza-tinta">
        La calle deja de aparecer en el catalogo. Se rechaza si tiene
        domicilios, pero los reportes existentes no bloquean la baja.
      </p>
      <Boton type="submit" variante="peligro">
        Dar de baja {calle.nombre}
      </Boton>
    </form>
  );
}
