import { InsigniaDeEstado, type TonoDeInsignia } from "@/shared/ui";
import { type EstadoDeReporte, ETIQUETA_DE_ESTADO_DE_REPORTE } from "../domain";

const TONO_DE_ESTADO: Record<EstadoDeReporte, TonoDeInsignia> = {
  RECIBIDO: "neutro",
  EN_ATENCION: "aviso",
  RESUELTO: "exito",
  RECHAZADO: "error",
};

/** El `flex` evita que la celda de la cuadricula estire la pastilla. */
export function InsigniaDeReporte({ estado }: { estado: EstadoDeReporte }) {
  return (
    <span className="flex">
      <InsigniaDeEstado
        tono={TONO_DE_ESTADO[estado]}
        etiqueta={ETIQUETA_DE_ESTADO_DE_REPORTE[estado]}
      />
    </span>
  );
}
