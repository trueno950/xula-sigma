import { WarningCircle } from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import {
  CLASES_DE_ERROR_DE_CAMPO,
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  descripcionDeCampo,
} from "./estilos";

type Props = Omit<ComponentProps<"input">, "className" | "id"> & {
  id: string;
  etiqueta: string;
  /** Una linea debajo del campo. Existe antes del error, no despues. */
  ayuda?: ReactNode;
  error?: string;
  /**
   * `dato` para CURP, folio y fecha: monoespaciada y en mayusculas, la
   * misma tipografia con la que el valor se va a leer despues en la tabla.
   * Es la unica variacion que admite el campo — no hay `className` abierto,
   * porque asi fue como cada pantalla termino con su propio input.
   */
  tipografia?: "texto" | "dato";
};

/**
 * El error de un campo: icono, texto y fondo suave de la senal. Lo comparte
 * `CampoDeLista` para que los dos campos del sistema lo digan igual.
 */
export function MensajeDeError({ id, texto }: { id: string; texto: string }) {
  return (
    <p id={id} className={CLASES_DE_ERROR_DE_CAMPO}>
      <WarningCircle
        size={16}
        weight="fill"
        aria-hidden="true"
        className="mt-px shrink-0"
      />
      {texto}
    </p>
  );
}

/**
 * Etiqueta, campo, ayuda y error como una sola pieza (`DESIGN.md`, Inputs).
 *
 * Los cuatro juntos y no sueltos porque la relacion entre ellos es lo que
 * un formulario a mano siempre pierde: la ayuda y el error se pintaban
 * pero no se anunciaban, y un lector de pantalla leia el campo sin ninguno
 * de los dos. `aria-describedby` los ata; `aria-invalid` dice que hay algo
 * mal sin depender del color del borde.
 *
 * La etiqueta va arriba y visible siempre. Nunca placeholder: desaparece
 * al escribir y el operador que se distrajo pierde el contexto.
 */
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  tipografia = "texto",
  ...resto
}: Props) {
  const idDeAyuda = `${id}-ayuda`;
  const idDeError = `${id}-error`;
  const descripcion = descripcionDeCampo(
    { ayuda, error },
    {
      idDeAyuda,
      idDeError,
    },
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={CLASES_DE_ETIQUETA}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={`${clasesDeCampo({ conError: Boolean(error) })}${
          tipografia === "dato" ? " font-mono uppercase" : ""
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion}
        {...resto}
      />
      {ayuda ? (
        <p id={idDeAyuda} className={CLASES_DE_ETIQUETA}>
          {ayuda}
        </p>
      ) : null}
      {error ? <MensajeDeError id={idDeError} texto={error} /> : null}
    </div>
  );
}
