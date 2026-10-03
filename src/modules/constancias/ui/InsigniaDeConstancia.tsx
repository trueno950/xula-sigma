import { InsigniaDeEstado } from "@/shared/ui";
import { ETIQUETA_DE_ESTADO_DE_CONSTANCIA } from "../domain";

/** El `flex` evita que la celda de la cuadricula estire la pastilla. */
export function InsigniaDeConstancia({ cancelada }: { cancelada: boolean }) {
  const estado = cancelada ? "CANCELADA" : "VIGENTE";

  return (
    <span className="flex">
      <InsigniaDeEstado
        tono={cancelada ? "error" : "exito"}
        etiqueta={ETIQUETA_DE_ESTADO_DE_CONSTANCIA[estado]}
      />
    </span>
  );
}
