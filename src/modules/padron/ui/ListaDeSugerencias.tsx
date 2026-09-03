import { Warning } from "@phosphor-icons/react";
import { CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { SugerenciaDeDuplicado } from "./actions/sugerirDuplicados.action";

export const ID_DE_LISTA = "sugerencias-de-duplicado";
export const idDeOpcion = (indice: number) => `${ID_DE_LISTA}-${indice}`;

const nombreCompleto = (persona: SugerenciaDeDuplicado) =>
  [persona.nombres, persona.primerApellido, persona.segundoApellido]
    .filter(Boolean)
    .join(" ");

type Props = {
  sugerencias: readonly SugerenciaDeDuplicado[];
  /** -1 es "ninguna marcada", que es el estado en el que se escribe. */
  activa: number;
};

/**
 * La superficie flotante del componente de firma: la parte que se ve.
 *
 * Vive aparte de `SugerenciaDeDuplicados` —que tiene el estado, el retardo
 * y el teclado— porque juntos pasaban las 200 lineas de la metrica, y el
 * corte por tema cae justo ahi: aca no hay una sola decision, solo el
 * dibujo de una lista que ya llego resuelta.
 *
 * Marcada con la senal de aviso **y la palabra "duplicado"**, nunca solo
 * con el color: la marca del municipio puede ser de ese mismo tono.
 *
 * Cada fila ofrece la ficha en otra pestana porque esa es la unica forma de
 * descartar un homonimo, y abrirla en la misma pestana perderia lo escrito
 * —que seria frenar la captura por el camino largo.
 */
export function ListaDeSugerencias({ sugerencias, activa }: Props) {
  return (
    <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-caliza-divisor bg-caliza-lienzo shadow-flotante">
      <p className="flex items-center gap-2 border-b border-caliza-divisor px-3 py-2 text-[13px] font-medium text-senial-aviso">
        <Warning size={16} weight="fill" aria-hidden="true" />
        {sugerencias.length === 1
          ? "1 posible duplicado"
          : `${sugerencias.length} posibles duplicados`}
      </p>
      {/*
        `aria-live="polite"` y no `assertive`: la lista aparece mientras se
        escribe, y una region asertiva interrumpiria a la operadora en cada
        tecla. Educada, como pide `DESIGN.md`.
      */}
      <div
        id={ID_DE_LISTA}
        role="listbox"
        aria-label="Posibles duplicados"
        aria-live="polite"
        className="flex flex-col"
      >
        {sugerencias.map((persona, indice) => (
          <div
            key={persona.id}
            id={idDeOpcion(indice)}
            role="option"
            aria-selected={indice === activa}
            // Fuera del orden de tabulacion a proposito: la opcion se marca
            // con `aria-activedescendant` y el cursor se queda en el campo.
            // Es la parte de "no roba el foco".
            tabIndex={-1}
            className={`flex flex-col gap-0.5 px-3 py-2 ${
              indice === activa ? "bg-caliza-relleno" : ""
            }`}
          >
            <span className="text-[15px] font-medium text-caliza-tinta">
              {nombreCompleto(persona)}
            </span>
            <a
              href={`/padron/${persona.id}`}
              target="_blank"
              rel="noopener"
              className={`${CLASES_DE_ETIQUETA} w-fit text-marca underline underline-offset-2`}
            >
              Ver su ficha en otra pestana
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
