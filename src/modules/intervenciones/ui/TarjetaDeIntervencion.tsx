import { FileText } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { fechaCivilCorta, fechaCivilLarga } from "@/shared/lib/fecha";
import { ANILLO_DE_FOCO } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import {
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
} from "../domain";
import { identificadorDeIntervencion } from "./identificadorDeIntervencion";

const LARGO_DEL_TROZO = 110;

/**
 * El trozo de la descripcion que cabe en una columna de 269px (S3): corta en
 * un espacio para no partir una palabra y cierra con puntos suspensivos, para
 * que se lea como un recorte y no como una descripcion equivocada.
 */
export const trozoDeDescripcion = (descripcion: string): string => {
  const limpia = descripcion.replace(/\s+/g, " ").trim();

  if (limpia.length <= LARGO_DEL_TROZO) return limpia;

  const corte = limpia.slice(0, LARGO_DEL_TROZO);
  const ultimoEspacio = corte.lastIndexOf(" ");
  const recorte = ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte;

  return `${recorte.trimEnd()}…`;
};

type Props = {
  intervencion: IntervencionGuardada;
  /** El nombre del lugar ya resuelto, o "No disponible". */
  lugar: string;
};

/**
 * Una obra del tablero: identificador estable y fecha arriba, tipo, trozo de
 * la descripcion y lugar, y el origen cuando la obra se programo desde un
 * reporte (S3).
 *
 * La tarjeta **no repite la insignia de estado**: el estado es el encabezado
 * de su columna. Si lo lleva el nombre accesible, porque quien navega por
 * enlaces no oye ese encabezado (S4).
 */
export function TarjetaDeIntervencion({ intervencion, lugar }: Props) {
  const identificador = identificadorDeIntervencion(intervencion.id);
  const desdeReporte = intervencion.reporteId !== null;
  const tipo = ETIQUETA_DE_TIPO_DE_INTERVENCION[intervencion.tipo];
  const etiqueta = [
    tipo,
    ETIQUETA_DE_ESTADO_DE_INTERVENCION[intervencion.estado],
    lugar,
    fechaCivilLarga(intervencion.fechaDeOcurrencia),
    ...(desdeReporte ? ["viene de un reporte"] : []),
  ].join(", ");

  return (
    <Link
      href={`/intervenciones/${intervencion.id}`}
      aria-label={`${identificador}: ${etiqueta}`}
      className={`flex flex-col gap-0.5 rounded-lg border border-caliza-divisor bg-caliza-lienzo p-3 text-caliza-tinta shadow-reposo transition-[background-color,box-shadow] duration-150 ease-salida hover:bg-caliza-superficie hover:shadow-elevada ${ANILLO_DE_FOCO}`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[14px] font-semibold tabular-nums">
          {identificador}
        </span>
        <span className="font-mono text-[14px] tabular-nums text-caliza-apagada">
          {fechaCivilCorta(intervencion.fechaDeOcurrencia)}
        </span>
      </span>
      <span className="text-[15px] leading-[1.4] font-semibold">{tipo}</span>
      <span className="mt-0.5 text-[13px] leading-[1.4] text-caliza-apagada">
        {trozoDeDescripcion(intervencion.descripcion)}
      </span>
      <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-caliza-apagada">
        <span>{lugar}</span>
        {desdeReporte ? (
          <span className="inline-flex items-center gap-1 font-medium">
            <FileText size={14} aria-hidden="true" />
            Desde reporte
          </span>
        ) : null}
      </span>
    </Link>
  );
}
