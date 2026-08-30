import type { Documentos } from "../application";
import { configurarDocumentosAction } from "./actions/configurarDocumentosAction";

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO =
  "h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta outline-none focus:border-marca focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-marca";

type Props = {
  documentos: Documentos | null;
};

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). Precarga los valores actuales con
 * `defaultValue`: `documentos` llega `null` cuando el ayuntamiento todavia
 * no configuro su bloque de firma (`leerDocumentos`, decision 19).
 */
export function ConfiguracionDeDocumentos({ documentos }: Props) {
  return (
    <form action={configurarDocumentosAction} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-medium text-caliza-tinta">
        Bloque de firma
      </h2>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Nombre de quien firma</span>
        <input
          name="firmanteNombre"
          type="text"
          defaultValue={documentos?.firmanteNombre ?? ""}
          className={CLASE_CAMPO}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Cargo</span>
        <input
          name="firmanteCargo"
          type="text"
          defaultValue={documentos?.firmanteCargo ?? ""}
          className={CLASE_CAMPO}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Leyenda de pie (opcional)</span>
        <input
          name="leyendaDePie"
          type="text"
          defaultValue={documentos?.leyendaDePie ?? ""}
          className={CLASE_CAMPO}
        />
      </label>
      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Guardar
      </button>
    </form>
  );
}
