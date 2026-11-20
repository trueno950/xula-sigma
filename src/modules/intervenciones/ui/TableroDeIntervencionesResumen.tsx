import {
  type ConteosDeIntervenciones,
  ESTADOS_DE_INTERVENCION,
  type EstadoDeIntervencion,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
} from "../domain";

/** Como se lee cada estado cuando son varias: el singular lo da `ETIQUETA_`. */
export const PLURAL_DE_ESTADO: Record<EstadoDeIntervencion, string> = {
  PLANIFICADA: "planificadas",
  EN_EJECUCION: "en ejecución",
  FINALIZADA: "finalizadas",
  CANCELADA: "canceladas",
};

export const enMinuscula = (texto: string): string =>
  `${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;

const conSuCuenta = (conteo: number, estado: EstadoDeIntervencion): string =>
  `${conteo} ${
    conteo === 1
      ? enMinuscula(ETIQUETA_DE_ESTADO_DE_INTERVENCION[estado])
      : PLURAL_DE_ESTADO[estado]
  }`;

const unirConY = (partes: readonly string[]): string =>
  partes.length > 1
    ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`
    : partes.join("");

/**
 * El total y su desglose por estado, con las mismas etiquetas que las
 * columnas (S2 del artboard `02-tablero-por-estado`): «13 intervenciones en el
 * municipio: 7 planificadas, 2 en ejecución, 2 finalizadas y 2 canceladas».
 */
export function ResumenDeConteos({
  conteos,
  conFiltros,
}: {
  conteos: ConteosDeIntervenciones;
  conFiltros: boolean;
}) {
  const desglose = ESTADOS_DE_INTERVENCION.map((estado) =>
    conSuCuenta(conteos.porEstado[estado], estado),
  );

  return (
    <p className="text-[15px] text-caliza-apagada">
      <strong className="font-semibold text-caliza-tinta">
        {conteos.total}
        {conteos.total === 1 ? " intervención" : " intervenciones"}
      </strong>{" "}
      {conFiltros ? "con estos filtros" : "en el municipio"}:{" "}
      {unirConY(desglose)}.
    </p>
  );
}
