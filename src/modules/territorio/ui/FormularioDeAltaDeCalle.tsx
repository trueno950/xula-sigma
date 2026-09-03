import { Boton, Campo } from "@/shared/ui";
import { altaDeCalleAction } from "./actions/altaDeCalleAction";

type Props = {
  /** Contexto del arbol: la calle cuelga del nodo seleccionado. */
  raiz: string;
  nodo: string;
};

/** Server Component, `<form action={...}>` nativo sin `"use client"`. */
export function FormularioDeAltaDeCalle({ raiz, nodo }: Props) {
  return (
    <form action={altaDeCalleAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="lugarId" value={nodo} />

      <Campo
        id="calle-nombre"
        name="nombre"
        etiqueta="Nombre"
        required
        ayuda="Como la conoce el municipio: Calle 20, Camino a Sisal."
      />

      <Boton type="submit" variante="primaria">
        Dar de alta
      </Boton>
    </form>
  );
}
