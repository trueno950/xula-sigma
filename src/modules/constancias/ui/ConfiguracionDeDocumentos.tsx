import {
  BarraDeAcciones,
  Boton,
  Campo,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
} from "@/shared/ui";
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
    <form action={configurarDocumentosAction} className={CLASES_DE_FORMULARIO}>
      <GrupoDeCampos titulo="Quién firma">
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
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Pie del documento">
        <Campo
          id="leyenda-de-pie"
          name="leyendaDePie"
          etiqueta="Leyenda de pie"
          ayuda="Opcional. Se deja vacía para quitarla."
          defaultValue={documentos?.leyendaDePie ?? ""}
          maxLength={300}
        />
      </GrupoDeCampos>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Guardar
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
