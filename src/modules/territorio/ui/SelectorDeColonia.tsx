import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ChangeEvent } from "react";
import {
  CLASES_DE_ETIQUETA,
  clasesDeCampo,
  type OpcionDeLista,
} from "@/shared/ui";
import { coloniasAOfrecer } from "./coloniasDelAlta";
import type { Asentamiento } from "./vistaDeDomicilios";
import type { NivelDelFormulario } from "./zonaDelFormulario";

type Props = {
  id: string;
  name: string;
  nivel: NivelDelFormulario;
  /** El de la calle elegida; sin el, las colonias van agrupadas. */
  asentamiento?: Asentamiento | undefined;
  defaultValue: string;
  onChange?: (evento: ChangeEvent<HTMLSelectElement>) => void;
};

const opcionesDe = (opciones: readonly OpcionDeLista[]) =>
  opciones.map((opcion) => (
    <option key={opcion.valor} value={opcion.valor}>
      {opcion.etiqueta}
    </option>
  ));

/**
 * El campo de Colonia. No es `CampoDeLista` porque necesita `<optgroup>`:
 * sin JavaScript la lista no se acorta por la calle, y los grupos por
 * asentamiento son lo que deja elegir con coherencia. Mismas clases y misma
 * etiqueta arriba y ayuda debajo que `CampoDeLista`.
 *
 * Sin colonias que ofrecer no hay select: hay una linea y el campo viaja
 * vacio, que el alta y la correccion leen como "el asentamiento de la calle".
 */
export function SelectorDeColonia({
  id,
  name,
  nivel,
  asentamiento,
  defaultValue,
  onChange,
}: Props) {
  const oferta = coloniasAOfrecer(nivel, asentamiento);
  const idDeAyuda = `${id}-ayuda`;

  if (oferta.forma === "ninguna") {
    return (
      <div className="flex flex-col gap-1.5">
        <input type="hidden" name={name} value="" />
        <p id={id} className={CLASES_DE_ETIQUETA}>
          {oferta.mensaje}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={CLASES_DE_ETIQUETA}>
        Colonia (opcional)
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          aria-describedby={idDeAyuda}
          onChange={onChange}
          className={`${clasesDeCampo()} appearance-none pr-9`}
        >
          <option value="">{nivel.marcador}</option>
          {oferta.forma === "grupos"
            ? oferta.grupos.map((grupo) => (
                <optgroup
                  key={grupo.asentamiento.id}
                  label={grupo.asentamiento.nombre}
                >
                  {opcionesDe(grupo.opciones)}
                </optgroup>
              ))
            : opcionesDe(oferta.opciones)}
          {nivel.sinColonia ? opcionesDe([nivel.sinColonia]) : null}
        </select>
        <CaretDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caliza-apagada"
        />
      </div>
      <p id={idDeAyuda} className={CLASES_DE_ETIQUETA}>
        {nivel.resumen}
      </p>
    </div>
  );
}
