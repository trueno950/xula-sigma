import { Boton, Campo } from "@/shared/ui";
import { editarLugarAction } from "./actions/editarLugarAction";

type Props = {
  /** Contexto del arbol: se renombra el nodo seleccionado. */
  raiz: string;
  nodo: string;
  /** El nombre de hoy, para que el campo no arranque vacio. */
  nombreActual: string;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`.
 *
 * El campo arranca con el nombre de hoy: renombrar casi siempre es
 * corregir una letra, y un campo vacio obliga a escribir todo de nuevo de
 * memoria, con el nombre viejo ya fuera de la pantalla.
 */
export function FormularioDeEdicionDeLugar({
  raiz,
  nodo,
  nombreActual,
}: Props) {
  return (
    <form action={editarLugarAction} className="flex flex-col gap-4">
      <input type="hidden" name="raiz" value={raiz} />
      <input type="hidden" name="nodo" value={nodo} />
      <input type="hidden" name="id" value={nodo} />

      <Campo
        id="lugar-nombre-nuevo"
        name="nombre"
        etiqueta="Nombre nuevo"
        required
        defaultValue={nombreActual}
      />

      <Boton type="submit" variante="primaria">
        Renombrar
      </Boton>
    </form>
  );
}
