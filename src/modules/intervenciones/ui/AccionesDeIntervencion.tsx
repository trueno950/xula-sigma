import { Boton } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import {
  ESTADOS_DE_INTERVENCION,
  type EstadoDeIntervencion,
  transicionValida,
} from "../domain";
import { cambiarEstadoAction } from "./actions/cambiarEstadoAction";

const ETIQUETAS: Record<EstadoDeIntervencion, string> = {
  PLANIFICADA: "Marcar planificada",
  EN_EJECUCION: "Marcar en ejecución",
  FINALIZADA: "Marcar finalizada",
  CANCELADA: "Cancelar",
};
function BotonDeEstado({
  id,
  estado,
}: {
  id: string;
  estado: EstadoDeIntervencion;
}) {
  return (
    <form action={cambiarEstadoAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estadoNuevo" value={estado} />
      <Boton type="submit">{ETIQUETAS[estado]}</Boton>
    </form>
  );
}

export function AccionesDeIntervencion({
  intervencion,
}: {
  intervencion: IntervencionGuardada;
}) {
  const destinos = ESTADOS_DE_INTERVENCION.filter((estado) =>
    transicionValida(intervencion.estado, estado),
  );

  return (
    <div className="flex flex-col gap-4">
      {destinos.map((estado) => (
        <BotonDeEstado key={estado} id={intervencion.id} estado={estado} />
      ))}
      {destinos.length === 0 ? (
        <p className="text-[15px] text-caliza-apagada">
          El estado es terminal; no se puede reabrir.
        </p>
      ) : null}
    </div>
  );
}
