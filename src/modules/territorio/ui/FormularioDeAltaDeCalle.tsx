import { Boton, Campo, GrupoDeCampos } from "@/shared/ui";
import { altaDeCalleAction } from "./actions/altaDeCalleAction";
import { PieDeFormulario } from "./PieDeFormulario";

type Props = {
  /** Contexto del arbol: la calle cuelga del nodo seleccionado. */
  raiz: string;
  nodo: string;
  /** Navegacion de retorno del cancelar; ver `PieDeFormulario`. */
  volverA?: string | undefined;
};

/** Server Component, `<form action={...}>` nativo sin `"use client"`. */
export function FormularioDeAltaDeCalle({ raiz, nodo, volverA }: Props) {
  return (
    <form action={altaDeCalleAction} className="flex flex-col gap-6">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="vista" value="calles" />
      <input type="hidden" name="accion" value="calle" />
      <input type="hidden" name="lugarId" value={nodo} />

      <GrupoDeCampos titulo="Datos de la calle">
        <Campo
          id="calle-nombre"
          name="nombre"
          etiqueta="Nombre"
          required
          ayuda="Como la conoce el municipio: Calle 20, Camino a Sisal."
        />
      </GrupoDeCampos>

      <PieDeFormulario volverA={volverA}>
        <Boton type="submit" variante="primaria">
          Dar de alta
        </Boton>
      </PieDeFormulario>
    </form>
  );
}
