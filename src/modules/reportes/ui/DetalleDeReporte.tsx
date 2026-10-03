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
 * Solo lectura, ordenado `ocurridoEn ASC` -el orden ya es parte del
 * contrato de `historialDe` (design.md seccion 10)-: se lee de arriba abajo
 * como la linea de tiempo del reporte, primero lo que paso primero. Mismo
 * marcado que `HistorialDeResidencias` de `territorio`.
 */
export function DetalleDeReporte({ historial }: Props) {
  if (historial.length === 0) {
    return <p className="text-[15px] text-caliza-apagada">Sin movimientos.</p>;
  }

  return (
    <ul className="divide-y divide-caliza-divisor overflow-clip rounded-lg border border-caliza-divisor bg-caliza-lienzo shadow-reposo">
      {historial.map((movimiento) => (
        <li key={movimiento.id} className="flex flex-col gap-0.5 px-5 py-3">
          <span className="text-[15px] text-caliza-tinta">
            {descripcionDe(movimiento)}
          </span>
          <span className={CLASES_DE_DATO}>
            {fechaYHoraEnMerida(movimiento.ocurridoEn)}
          </span>
        </li>
      ))}
    </ul>
  );
}
