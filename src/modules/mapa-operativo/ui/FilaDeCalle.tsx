import Link from "next/link";
import { ANILLO_DE_FOCO, CLASES_DE_ENLACE } from "@/shared/ui";
import type { MarcadorDeMapa } from "../domain";
import { FilaDeHecho } from "./FilaDeHecho";

type Props = {
  marcador: MarcadorDeMapa;
  elegida: boolean;
  /** `null` suelta la seleccion; la fila y el pin se eligen y se sueltan. */
  onSeleccion: (clave: string | null) => void;
};

const cuantosHechos = (total: number) =>
  `${total} ${total === 1 ? "hecho" : "hechos"} en esta calle`;

/**
 * Una calle del panel (S4 y S5): su numero de orden -el mismo del pin-, su
 * nombre, su territorio y sus hechos. El numero y el nombre son un `<button>`
 * y no un `onClick` en la fila: elegirla tiene que funcionar con teclado, y un
 * boton que envuelve texto deja los enlaces de adentro intactos.
 */
export function FilaDeCalle({ marcador, elegida, onSeleccion }: Props) {
  return (
    <li
      data-calle={marcador.clave}
      data-elegida={elegida ? "1" : undefined}
      className={`flex flex-col gap-2 border-b border-caliza-divisor px-4 py-3 last:border-b-0 ${
        elegida ? "bg-caliza-superficie" : ""
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <button
          type="button"
          aria-pressed={elegida}
          onClick={() => onSeleccion(elegida ? null : marcador.clave)}
          className={`flex items-center gap-2 text-left ${ANILLO_DE_FOCO}`}
        >
          <span
            aria-hidden="true"
            data-numero-de-fila={marcador.orden}
            className={`inline-grid size-[22px] shrink-0 place-items-center rounded-pill font-mono text-[12px] font-semibold ${
              elegida
                ? "bg-caliza-tinta text-caliza-lienzo"
                : "bg-caliza-relleno text-caliza-tinta"
            }`}
          >
            {marcador.orden}
          </span>
          <span className="text-[15px] font-semibold text-caliza-tinta">
            {marcador.calleNombre}
          </span>
        </button>
        {marcador.territorioNombre ? (
          <span className="ml-auto text-[13px] text-caliza-apagada">
            {marcador.territorioNombre}
          </span>
        ) : null}
      </div>
      <p className="text-[13px] text-caliza-apagada">
        {cuantosHechos(marcador.hechos.length)}
      </p>
      <ul className="flex flex-col gap-2">
        {marcador.hechos.map((hecho) => (
          <FilaDeHecho key={hecho.id} hecho={hecho} />
        ))}
      </ul>
      {marcador.historiaHref ? (
        <Link
          href={marcador.historiaHref}
          className={`self-start text-[13px] ${CLASES_DE_ENLACE}`}
        >
          Ver historial de calle
        </Link>
      ) : null}
    </li>
  );
}
