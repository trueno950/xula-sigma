import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import { CLASES_DE_DATO } from "@/shared/ui";
import type { MovimientoGuardado } from "../application/puertosDeMovimientos";
import {
  ETIQUETA_DE_AREA,
  ETIQUETA_DE_ESTADO_DE_REPORTE,
  ETIQUETA_DE_MOTIVO_DE_RECHAZO,
} from "../domain";

type Props = {
  historial: readonly MovimientoGuardado[];
};

/** Que paso en un movimiento, en una linea: el estado, o el area asignada. */
const descripcionDe = (movimiento: MovimientoGuardado): string => {
  if (movimiento.areaAsignada)
    return `Área asignada: ${ETIQUETA_DE_AREA[movimiento.areaAsignada]}`;
  if (movimiento.estadoAnterior === null) return "Reporte recibido";
  const motivo = movimiento.motivo
    ? ` (${ETIQUETA_DE_MOTIVO_DE_RECHAZO[movimiento.motivo]})`
    : "";
  const anterior = ETIQUETA_DE_ESTADO_DE_REPORTE[movimiento.estadoAnterior];
  const nuevo = movimiento.estadoNuevo
    ? ETIQUETA_DE_ESTADO_DE_REPORTE[movimiento.estadoNuevo]
    : "";
  return `${anterior} → ${nuevo}${motivo}`;
};

/**
 * La linea de tiempo del reporte (S15 de `reportes-ux`): solo lectura,
 * ordenado `ocurridoEn ASC` -el orden ya es parte del contrato de
 * `historialDe` (design.md seccion 10)-, asi que se lee de arriba abajo como
 * lo que paso, primero lo que paso primero.
 *
 * Vive fuera de la ficha y de los formularios a proposito: en el telefono la
 * linea de tiempo va despues de las acciones, nunca detras de un formulario
 * plegado.
 */
export function HistorialDeReporte({ historial }: Props) {
  if (historial.length === 0) {
    return <p className="text-[15px] text-caliza-apagada">Sin movimientos.</p>;
  }

  return (
    <ol className="flex flex-col">
      {historial.map((movimiento, indice) => (
        <li key={movimiento.id} className="relative flex gap-3 pb-5 last:pb-0">
          {indice === historial.length - 1 ? null : (
            <span
              aria-hidden="true"
              className="absolute top-4 left-[5px] h-[calc(100%-1rem)] w-0.5 bg-caliza-divisor"
            />
          )}
          <span
            aria-hidden="true"
            className="mt-1.5 size-3 shrink-0 rounded-pill bg-caliza-tinta"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-caliza-tinta">
              {descripcionDe(movimiento)}
            </p>
            <p className={CLASES_DE_DATO}>
              <time dateTime={movimiento.ocurridoEn.toISOString()}>
                {fechaYHoraEnMerida(movimiento.ocurridoEn)}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
