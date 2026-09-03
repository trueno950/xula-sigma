import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import {
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  descripcionDeCampo,
} from "./estilos";

export type OpcionDeLista = { valor: string; etiqueta: string };

type Props = Omit<ComponentProps<"select">, "className" | "id" | "children"> & {
  id: string;
  etiqueta: string;
  opciones: readonly OpcionDeLista[];
  /**
   * La primera opcion, la que se ve sin elegir nada. Deshabilitada cuando
   * el campo es obligatorio -es el estado inicial, no una respuesta- y
   * habilitada cuando no lo es, porque ahi "ninguna" si es una respuesta.
   */
  marcador: string;
  opcional?: boolean;
  ayuda?: ReactNode;
  error?: string;
};

/**
 * El `<select>` del sistema: mismas clases de campo, misma etiqueta arriba,
 * misma ayuda debajo.
 *
 * **La lista desplegada la sigue dibujando el sistema operativo**, y eso es
 * a proposito: un desplegable propio hay que enseñarle a funcionar con
 * teclado, con lector de pantalla y en el navegador del municipio, y la
 * nativa ya lo hace. Lo que se estiliza es el control cerrado, que es lo
 * que convive con los demas campos del formulario. `appearance-none` quita
 * la flecha del sistema para que la nuestra quede a la misma distancia del
 * borde que el icono de cualquier otro campo.
 *
 * Reemplaza a `SelectorDeCalle` y `SelectorDeLugar`, que traian cada uno su
 * copia de la cadena del campo y ninguna etiqueta propia: la asociacion
 * `label`/control quedaba del lado del que los usara, y en
 * `FormularioDeDomicilio` habia tres `<label>` vacios envolviendo nada.
 */
export function CampoDeLista({
  id,
  etiqueta,
  opciones,
  marcador,
  opcional = false,
  ayuda,
  error,
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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={CLASES_DE_ETIQUETA}>
        {etiqueta}
      </label>
      <div className="relative">
        <select
          id={id}
          required={!opcional}
          defaultValue=""
          aria-invalid={error ? true : undefined}
          aria-describedby={descripcion}
          className={`${clasesDeCampo({ conError: Boolean(error) })} appearance-none pr-9`}
          {...resto}
        >
          <option value="" disabled={!opcional}>
            {marcador}
          </option>
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <CaretDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
        />
      </div>
      {ayuda ? (
        <p id={idDeAyuda} className={CLASES_DE_ETIQUETA}>
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idDeError} className="text-[13px] font-medium text-senial-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
