import { Boton, Campo } from "@/shared/ui";
import { renombrarCalleAction } from "./actions/renombrarCalleAction";
import type { CalleParaPanel } from "./vistaDeCalles";

type Props = {
  /** Contexto del arbol: a donde volver despues del renombre. */
  raiz: string;
  nodo: string;
  calle: CalleParaPanel;
};

export function FormularioDeRenombreDeCalle({ raiz, nodo, calle }: Props) {
  return (
    <form action={renombrarCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="calles" />
      <input type="hidden" name="accion" value="renombrarCalle" />
      <input type="hidden" name="calle" value={calle.id} />
      <input type="hidden" name="id" value={calle.id} />

      <p className="text-[15px] text-caliza-tinta">{calle.nombre}</p>

      <Campo
        id="renombrar-calle-nombre"
        name="nombre"
        etiqueta="Nombre nuevo"
        required
        ayuda="El cambio alcanza a todos los domicilios de esa calle."
      />

      <Boton type="submit" variante="primaria">
        Renombrar
      </Boton>
    </form>
  );
}
