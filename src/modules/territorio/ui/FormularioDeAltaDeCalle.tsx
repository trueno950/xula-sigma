import { altaDeCalleAction } from "./actions/altaDeCalleAction";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

type Props = {
  /** Precargado con la raiz que la pagina ya tiene seleccionada; sigue editable para dar de alta en otro lugar. */
  lugarId: string;
};

/** Server Component, `<form action={...}>` nativo sin `"use client"`. */
export function FormularioDeAltaDeCalle({ lugarId }: Props) {
  return (
    <form action={altaDeCalleAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">Nueva calle</h2>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Nombre</span>
        <input name="nombre" type="text" className={CLASE_CAMPO} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Id del lugar</span>
        <input
          name="lugarId"
          type="text"
          defaultValue={lugarId}
          className={CLASE_CAMPO}
        />
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
