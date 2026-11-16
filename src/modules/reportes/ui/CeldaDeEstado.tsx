import type { EstadoDeReporte } from "../domain";
import { InsigniaDeAtraso } from "./InsigniaDeAtraso";
import { InsigniaDeReporte } from "./InsigniaDeReporte";

/**
 * La celda de estado de la bandeja: la insignia del estado y, cuando el
 * reporte se paso del umbral del municipio, la de atraso al lado. Las dos
 * juntas porque un `RECIBIDO` atrasado es una sola lectura -"recibido, y
 * lleva N dias asi"-, no dos columnas que la operadora tenga que cruzar.
 */
export function CeldaDeEstado({
  estado,
  atraso,
}: {
  estado: EstadoDeReporte;
  atraso: number | null;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <InsigniaDeReporte estado={estado} />
      {atraso === null ? null : <InsigniaDeAtraso dias={atraso} />}
    </span>
  );
}
