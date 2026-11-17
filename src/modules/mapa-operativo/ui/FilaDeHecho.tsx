import Link from "next/link";
import { fechaCivilCorta } from "@/shared/lib/fecha";
import { CLASES_DE_ENLACE, InsigniaDeEstado } from "@/shared/ui";
import { colorVerificado, type HechoEnMarcador, tonoDeEstado } from "../domain";
import { etiquetaDeRecurso } from "./etiquetasDeRecurso";
import { IconoDeMapa } from "./IconoDeMapa";

/**
 * Un hecho de la fila de su calle (S4): el icono del tipo sobre el color de
 * su estado, el folio o tipo enlazado, la insignia de estado con su palabra,
 * el tipo, la fecha civil y el atraso cuando lo tiene.
 *
 * El nombre accesible del enlace dice que es -reporte o intervencion-, porque
 * el renglon solo muestra el folio y quien no ve el icono no lo adivina.
 *
 * El folio y la insignia van en la misma linea: la linea no envuelve y el
 * folio cede ancho -`min-w-0`- y se parte antes que empujar la insignia a un
 * segundo renglon. Con `flex-wrap` la insignia bajaba aunque el folio pudiera
 * encogerse: el corte de linea de flex usa el ancho hipotetico, no el
 * encogido.
 */
export function FilaDeHecho({ hecho }: { hecho: HechoEnMarcador }) {
  return (
    <li className="grid grid-cols-[18px_1fr] items-start gap-x-2 gap-y-1">
      <span
        aria-hidden="true"
        className="grid size-[18px] place-items-center rounded-pill text-caliza-lienzo"
        style={{ background: colorVerificado(hecho.color) }}
      >
        <IconoDeMapa clave={hecho.icono} tamano={12} />
      </span>
      <span className="flex min-w-0 items-center gap-x-2">
        <Link
          href={hecho.href}
          aria-label={`${etiquetaDeRecurso(hecho.recurso)}: ${hecho.etiqueta}`}
          className={`min-w-0 font-mono text-[14px] break-words tabular-nums ${CLASES_DE_ENLACE}`}
        >
          {hecho.etiqueta}
        </Link>
        <InsigniaDeEstado
          tono={tonoDeEstado(hecho.estado)}
          etiqueta={hecho.etiquetaDeEstado}
        />
      </span>
      <span className="col-start-2 flex flex-wrap items-baseline gap-x-2 text-[13px] text-caliza-apagada">
        <span>{hecho.etiquetaDeTipo}</span>
        {hecho.fechaCivil === "" ? null : (
          <time dateTime={hecho.fechaCivil}>
            {fechaCivilCorta(hecho.fechaCivil)}
          </time>
        )}
        {hecho.diasDeAtraso === null ? null : (
          <strong className="font-semibold text-senial-error">
            Atrasado · {hecho.diasDeAtraso}{" "}
            {hecho.diasDeAtraso === 1 ? "día" : "días"}
          </strong>
        )}
      </span>
    </li>
  );
}
