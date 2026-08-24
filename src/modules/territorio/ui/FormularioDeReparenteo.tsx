import { reparentearLugarAction } from "./actions/reparentearLugarAction";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

/** Server Component, `<form action={...}>` nativo sin `"use client"`. */
export function FormularioDeReparenteo() {
  return (
    <form action={reparentearLugarAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Reparentear lugar
      </h2>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Id del lugar a mover</span>
        <input name="lugarId" type="text" className={CLASE_CAMPO} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>
          Id del nuevo padre (vacio = raiz)
        </span>
        <input name="nuevoPadreId" type="text" className={CLASE_CAMPO} />
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Reparentear
      </button>
    </form>
  );
}
