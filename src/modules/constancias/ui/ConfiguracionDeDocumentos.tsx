import { Boton, Campo } from "@/shared/ui";
import type { Documentos } from "../application";
import { configurarDocumentosAction } from "./actions/configurarDocumentosAction";

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
    <form action={configurarDocumentosAction} className="flex flex-col gap-4">
      <Campo
        id="firmante-nombre"
        name="firmanteNombre"
        etiqueta="Nombre de quien firma"
        defaultValue={documentos?.firmanteNombre ?? ""}
        required
        minLength={3}
        maxLength={120}
      />
      <Campo
        id="firmante-cargo"
        name="firmanteCargo"
        etiqueta="Cargo"
        ayuda="Como aparece en el nombramiento: Secretario Municipal, Presidente Municipal."
        defaultValue={documentos?.firmanteCargo ?? ""}
        required
        minLength={3}
        maxLength={120}
      />
      <Campo
        id="leyenda-de-pie"
        name="leyendaDePie"
        etiqueta="Leyenda de pie"
        ayuda="Opcional. Se deja vacía para quitarla."
        defaultValue={documentos?.leyendaDePie ?? ""}
        maxLength={300}
      />

      <Boton type="submit" variante="primaria">
        Guardar
      </Boton>
    </form>
  );
}
