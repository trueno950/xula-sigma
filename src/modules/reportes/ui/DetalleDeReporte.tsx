import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import type { MovimientoGuardado } from "../application/puertos";

type Props = {
  historial: readonly MovimientoGuardado[];
};

/** Que paso en un movimiento, en una linea: el estado, o el area asignada. */
const descripcionDe = (movimiento: MovimientoGuardado): string => {
  if (movimiento.areaAsignada)
    return `Area asignada: ${movimiento.areaAsignada}`;
  if (movimiento.estadoAnterior === null) return "Reporte recibido";
  const motivo = movimiento.motivo ? ` (${movimiento.motivo})` : "";
  return `${movimiento.estadoAnterior} -> ${movimiento.estadoNuevo}${motivo}`;
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
    <ul className="flex flex-col gap-2">
      {historial.map((movimiento) => (
        <li
          key={movimiento.id}
          className="flex flex-col gap-0.5 rounded-sm border border-caliza-borde p-3"
        >
          <span className="text-[15px] text-caliza-tinta">
            {descripcionDe(movimiento)}
          </span>
          <span className="text-[13px] text-caliza-apagada">
            {fechaYHoraEnMerida(movimiento.ocurridoEn)}
          </span>
        </li>
      ))}
    </ul>
  );
}
