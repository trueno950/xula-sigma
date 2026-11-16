import { InsigniaDeEstado, type TonoDeInsignia } from "@/shared/ui";
import {
  type EstadoDeIntervencion,
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
} from "../domain";

const TONO_DE_ESTADO: Record<EstadoDeIntervencion, TonoDeInsignia> = {
  PLANIFICADA: "neutro",
  EN_EJECUCION: "aviso",
  FINALIZADA: "exito",
  CANCELADA: "error",
};

/** El `flex` evita que la celda de la cuadricula estire la pastilla. */
export function InsigniaDeIntervencion({
  estado,
}: {
  estado: EstadoDeIntervencion;
}) {
  return (
    <span className="flex">
      <InsigniaDeEstado
        tono={TONO_DE_ESTADO[estado]}
        etiqueta={ETIQUETA_DE_ESTADO_DE_INTERVENCION[estado]}
      />
    </span>
  );
}
